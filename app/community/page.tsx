"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import PostPopup from "./components/PostPopup";
import {
  Heart,
  MessageCircle,
  Image as ImageIcon,
  Send,
  Radio,
  Bookmark,
  User,
} from "lucide-react";

type Post = {
  id: string;
  userId: string;
  description: string;
  likeCount: number;
  image: string | null;
  created_at: string;
};

type Comment = {
  id: string;
  content: string;
  postId: string;
  userId: string;
  userName: string;
};

export default function Community() {
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);

  const [contributors, setContributors] = useState<
    { id: string; name: string; role: string | null; count: number }[]
  >([]);

  const [loadingContributors, setLoadingContributors] = useState(false);
  const [reactedPostIds, setReactedPostIds] = useState<Set<string>>(new Set());
  const [reactingIds, setReactingIds] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [commentTextByPost, setCommentTextByPost] = useState<
    Record<string, string>
  >({});
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [postFilter, setPostFilter] = useState<"all" | "mine" | "reacted">(
    "all",
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    setLoading(true);
    setError(null);

    const supabase = createClient();

    const { data, error } = await supabase
      .from("Post")
      .select("id, userId, description, likeCount, image, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const fetchedPosts = data ?? [];

    // 1. Show the posts immediately to the user
    setPosts(fetchedPosts);
    setLoading(false);

    // 2. Fire metadata fetches asynchronously in the background
    loadComments(fetchedPosts);
    loadUserReactions(fetchedPosts);
    computeTopContributors(fetchedPosts);
  };

  const loadComments = async (allPosts: Post[]) => {
    const postIds = allPosts.map((p) => p.id);

    if (!postIds.length) {
      setComments([]);
      return;
    }

    const supabase = createClient();

    const { data, error } = await supabase
      .from("Comment")
      .select("id, content, postId, userId, userName")
      .in("postId", postIds);

    if (error) {
      setError(error.message);
      return;
    }

    setComments(data ?? []);
  };

  const loadUserReactions = async (allPosts: Post[]) => {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData?.user?.id) {
      setCurrentUserId(null);
      setReactedPostIds(new Set());
      return;
    }

    setCurrentUserId(userData.user.id);

    const postIds = allPosts.map((p) => p.id);
    if (!postIds.length) return;

    const { data } = await supabase
      .from("React")
      .select("postId")
      .eq("userId", userData.user.id)
      .in("postId", postIds);

    const reacted = new Set<string>();
    for (const r of data ?? []) {
      reacted.add(r.postId);
    }

    setReactedPostIds(reacted);
  };

  const computeTopContributors = async (allPosts: Post[]) => {
    setLoadingContributors(true);

    const counts = new Map<string, number>();
    for (const post of allPosts) {
      counts.set(post.userId, (counts.get(post.userId) ?? 0) + 1);
    }

    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 10);

    if (!top.length) {
      setContributors([]);
      setLoadingContributors(false);
      return;
    }

    const supabase = createClient();
    const { data } = await supabase
      .from("User")
      .select("id, name, role")
      .in(
        "id",
        top.map((t) => t[0]),
      );

    const usersMap = new Map();
    for (const user of data ?? []) {
      usersMap.set(user.id, user);
    }

    const merged = top.map(([id, count]) => ({
      id,
      count,
      name: usersMap.get(id)?.name ?? "Unknown",
      role: usersMap.get(id)?.role ?? null,
    }));

    setContributors(merged);
    setLoadingContributors(false);
  };

  const readImage = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") resolve(reader.result);
        else reject();
      };
      reader.onerror = () => reject();
      reader.readAsDataURL(file);
    });

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);

    if (!file) {
      setImagePreview(null);
      return;
    }

    try {
      const result = await readImage(file);
      setImagePreview(result);
    } catch {
      setImagePreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData?.user?.id) {
      setError("Please login.");
      setSaving(false);
      return;
    }

    let image: string | null = null;
    if (imageFile) {
      image = await readImage(imageFile);
    }

    const { error } = await supabase.from("Post").insert({
      userId: userData.user.id,
      description: description.trim(),
      likeCount: 0,
      image,
    });

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setDescription("");
    setImageFile(null);
    setImagePreview(null);

    await loadPosts();
    setSaving(false);
  };

  const toggleReact = async (postId: string, currentLikeCount: number) => {
    const supabase = createClient();
    setReactingIds((prev) => new Set(prev).add(postId));

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) return;

      const userId = userData.user.id;
      const isReacted = reactedPostIds.has(postId);

      if (isReacted) {
        await supabase.from("React").delete().match({ postId, userId });
        await supabase
          .from("Post")
          .update({ likeCount: Math.max(0, currentLikeCount - 1) })
          .eq("id", postId);

        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, likeCount: Math.max(0, p.likeCount - 1) }
              : p,
          ),
        );

        setReactedPostIds((prev) => {
          const next = new Set(prev);
          next.delete(postId);
          return next;
        });
      } else {
        await supabase.from("React").insert({ postId, userId });
        await supabase
          .from("Post")
          .update({ likeCount: currentLikeCount + 1 })
          .eq("id", postId);

        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, likeCount: p.likeCount + 1 } : p,
          ),
        );

        setReactedPostIds((prev) => new Set(prev).add(postId));
      }
    } finally {
      setReactingIds((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    }
  };

  const handleCommentSubmit = async (postId: string) => {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData?.user?.id) return;

    const content = (commentTextByPost[postId] ?? "").trim();
    if (!content) return;

    const { error } = await supabase.from("Comment").insert({
      content,
      postId,
      userId: userData.user.id,
      userName:
        userData.user.user_metadata?.name || userData.user.email || "User",
    });

    if (error) {
      setError(error.message);
      return;
    }

    setCommentTextByPost((prev) => ({ ...prev, [postId]: "" }));
    await loadComments(posts);
  };

  const filteredPosts = posts.filter((post) => {
    if (postFilter === "all") return true;
    if (postFilter === "mine") return post.userId === currentUserId;
    if (postFilter === "reacted") return reactedPostIds.has(post.id);
    return true;
  });

  return (
    <div className="min-h-screen bg-[#f3f4f5] px-4 py-6 lg:px-8">
      <div className="mx-auto flex max-w-[1400px] gap-8">
        {/* Sidebar Left */}
        <aside className="hidden lg:flex w-[260px] shrink-0 flex-col gap-6">
          <div className="rounded-3xl border border-[#d6d6d5] bg-white p-5">
            <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#949492]">
              Community Hub
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => setPostFilter("all")}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition ${
                  postFilter === "all"
                    ? "bg-[#f3f4f5] text-[#1d2846]"
                    : "text-[#949492] hover:bg-[#f3f4f5]"
                }`}
              >
                <Radio className="size-4" />
                Live Feed
              </button>

              <button
                onClick={() => setPostFilter("reacted")}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition ${
                  postFilter === "reacted"
                    ? "bg-[#f3f4f5] text-[#1d2846]"
                    : "text-[#949492] hover:bg-[#f3f4f5]"
                }`}
              >
                <Bookmark className="size-4" />
                Reacted Posts
              </button>

              <button
                onClick={() => setPostFilter("mine")}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition ${
                  postFilter === "mine"
                    ? "bg-[#f3f4f5] text-[#1d2846]"
                    : "text-[#949492] hover:bg-[#f3f4f5]"
                }`}
              >
                <User className="size-4" />
                My Posts
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Feed */}
        <section className="flex-1">
          <form
            onSubmit={handleSubmit}
            className="overflow-hidden rounded-3xl border border-[#d6d6d5] bg-white"
          >
            <div className="p-5">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Share an update, snippet, or ask a question..."
                className="min-h-[120px] w-full resize-none border-none bg-transparent text-sm text-[#1d2846] outline-none placeholder:text-[#949492]"
              />

              {imagePreview && (
                <div className="mt-4 overflow-hidden rounded-2xl border border-[#d6d6d5]">
                  <img
                    src={imagePreview}
                    alt="preview"
                    className="max-h-[400px] w-full object-cover"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-[#d6d6d5] bg-[#f3f4f5]/60 px-5 py-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-[#949492] transition hover:bg-[#d6d6d5]">
                <ImageIcon className="size-4" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
                Add Image
              </label>

              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-[#1d2846] px-6 py-2 text-sm font-bold text-white transition hover:opacity-90"
              >
                {saving ? "Posting..." : "Post"}
                <Send className="size-4" />
              </button>
            </div>
          </form>

          {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

          <div className="mt-6 flex flex-col gap-6">
            {loading ? (
              <div className="rounded-3xl border border-[#d6d6d5] bg-white p-6">
                Loading posts...
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="rounded-3xl border border-[#d6d6d5] bg-white p-6">
                No posts found.
              </div>
            ) : (
              filteredPosts.map((post) => (
                <article
                  key={post.id}
                  className="rounded-3xl border border-[#d6d6d5] bg-white p-5"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1d2846] text-sm font-bold text-white">
                      {post.userId.charAt(0).toUpperCase()}
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-[#1d2846]">
                        {post.userId}
                      </h4>
                      <p className="text-xs text-[#949492]">
                        {new Date(post.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-[#1d2846]">
                    {post.description}
                  </p>

                  {post.image && (
                    <div className="mt-4 overflow-hidden rounded-2xl border border-[#d6d6d5]">
                      <img
                        src={post.image}
                        alt="post"
                        className="max-h-[500px] w-full object-cover"
                      />
                    </div>
                  )}

                  <div className="mt-5 flex items-center gap-6 border-t border-[#d6d6d5] pt-4">
                    <button
                      onClick={() => toggleReact(post.id, post.likeCount)}
                      disabled={reactingIds.has(post.id)}
                      className="flex items-center gap-2 text-sm font-bold cursor-pointer"
                    >
                      <Heart
                        className={`size-5 ${
                          reactedPostIds.has(post.id)
                            ? "fill-red-500 text-red-500"
                            : "text-[#949492]"
                        }`}
                      />
                      <span
                        className={
                          reactedPostIds.has(post.id)
                            ? "text-red-500"
                            : "text-[#949492]"
                        }
                      >
                        {post.likeCount}
                      </span>
                    </button>

                    <button
                      onClick={() => setSelectedPost(post)}
                      className="flex items-center gap-2 text-sm font-bold text-[#949492] cursor-pointer"
                    >
                      <MessageCircle className="size-5" />
                      {comments.filter((c) => c.postId === post.id).length}
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        {/* Sidebar Right */}
        <aside className="hidden xl:block w-[300px] shrink-0">
          <div className="rounded-3xl border border-[#d6d6d5] bg-white p-5">
            <h3 className="mb-5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#949492]">
              Top Contributors
            </h3>

            {loadingContributors ? (
              <p className="text-sm text-[#949492]">Loading...</p>
            ) : (
              <div className="space-y-4">
                {contributors.map((c) => (
                  <div key={c.id} className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1d2846] text-sm font-bold text-white">
                      {c.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1">
                      <p className="text-sm font-bold text-[#1d2846]">
                        {c.name}
                      </p>
                      <p className="text-xs text-[#949492]">
                        {c.role ?? "Member"}
                      </p>
                    </div>

                    <div className="text-sm font-bold text-[#1d2846]">
                      {c.count}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      {selectedPost && (
        <PostPopup
          post={selectedPost}
          comments={comments.filter((c) => c.postId === selectedPost.id)}
          commentText={commentTextByPost[selectedPost.id] ?? ""}
          onCommentChange={(value) =>
            setCommentTextByPost((prev) => ({
              ...prev,
              [selectedPost.id]: value,
            }))
          }
          onSubmitComment={() => handleCommentSubmit(selectedPost.id)}
          onClose={() => setSelectedPost(null)}
          reacted={reactedPostIds.has(selectedPost.id)}
          reacting={reactingIds.has(selectedPost.id)}
          onToggleReact={() =>
            toggleReact(selectedPost.id, selectedPost.likeCount)
          }
        />
      )}
    </div>
  );
}
