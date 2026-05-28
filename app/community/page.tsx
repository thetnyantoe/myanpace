"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

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
  const [contributors, setContributors] = useState<
    { id: string; name: string; role: string | null; count: number }[]
  >([]);
  const [loadingContributors, setLoadingContributors] = useState(false);
  const [reactedPostIds, setReactedPostIds] = useState<Set<string>>(new Set());
  const [reactingIds, setReactingIds] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentTextByPost, setCommentTextByPost] = useState<
    Record<string, string>
  >({});
  const [commentInputOpen, setCommentInputOpen] = useState<Set<string>>(
    new Set(),
  );
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
    const { data, error: loadError } = await supabase
      .from("Post")
      .select("id, userId, description, likeCount, image, created_at")
      .order("created_at", { ascending: false });
    if (loadError) {
      setError(loadError.message);
    } else {
      setPosts(data ?? []);
    }
    setLoading(false);
    computeTopContributors(data ?? []);
    await loadUserReactions(data ?? []);
    await loadComments(data ?? []);
  };

  const loadComments = async (allPosts: Post[]) => {
    const postIds = (allPosts ?? []).map((p) => p.id);
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

  const filteredPosts = posts.filter((p) => {
    if (postFilter === "all") return true;
    if (postFilter === "mine")
      return currentUserId !== null && p.userId === currentUserId;
    if (postFilter === "reacted") return reactedPostIds.has(p.id);
    return true;
  });

  const loadUserReactions = async (allPosts: Post[]) => {
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) {
        setReactedPostIds(new Set());
        setCurrentUserId(null);
        return;
      }
      setCurrentUserId(userData.user.id);

      const postIds = (allPosts ?? []).map((p) => p.id);
      if (!postIds.length) {
        setReactedPostIds(new Set());
        return;
      }

      const { data: reacts } = await supabase
        .from("React")
        .select("postId, userId")
        .in("postId", postIds)
        .eq("userId", userData.user.id);

      const reacted = new Set<string>();
      for (const r of reacts ?? []) reacted.add(r.postId);
      setReactedPostIds(reacted);
    } catch (caughtError) {
      setError("Unable to load reactions. Please check your network.");
      setReactedPostIds(new Set());
      setCurrentUserId(null);
    }
  };

  const computeTopContributors = async (allPosts: Post[]) => {
    setLoadingContributors(true);
    const counts = new Map<string, number>();
    for (const p of allPosts) {
      counts.set(p.userId, (counts.get(p.userId) ?? 0) + 1);
    }

    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 10);
    if (top.length === 0) {
      setContributors([]);
      setLoadingContributors(false);
      return;
    }

    const supabase = createClient();
    const userIds = top.map((t) => t[0]);
    const { data: users, error: userError } = await supabase
      .from("User")
      .select("id, name, role")
      .in("id", userIds);

    if (userError) {
      setContributors(
        top.map(([id, count]) => ({ id, name: id, role: null, count })),
      );
      setLoadingContributors(false);
      return;
    }

    const usersById = new Map<string, { name: string; role: string | null }>();
    for (const u of users ?? []) {
      usersById.set(u.id, { name: u.name ?? u.id, role: u.role ?? null });
    }

    const merged = top.map(([id, count]) => {
      const u = usersById.get(id);
      return { id, name: u?.name ?? id, role: u?.role ?? null, count };
    });

    setContributors(merged);
    setLoadingContributors(false);
  };

  const readImage = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Failed to read image."));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setImageFile(file);
    if (!file) {
      setImagePreview(null);
      return;
    }
    readImage(file)
      .then(setImagePreview)
      .catch(() => setImagePreview(null));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const supabase = createClient();

    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user?.id) {
      setError("Please sign in to post.");
      setSaving(false);
      return;
    }

    let imageText: string | null = null;
    if (imageFile) {
      try {
        imageText = await readImage(imageFile);
      } catch {
        setError("Unable to read image.");
        setSaving(false);
        return;
      }
    }

    const { error: insertError } = await supabase.from("Post").insert({
      userId: userData.user.id,
      description: description.trim(),
      likeCount: 0,
      image: imageText,
    });

    if (insertError) {
      setError(insertError.message);
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
    setError(null);
    setReactingIds((s) => new Set(s).add(postId));
    try {
      const supabase = createClient();
      const { data: userData, error: authError } =
        await supabase.auth.getUser();
      if (authError || !userData?.user?.id) {
        setError("Please log in to react.");
        return;
      }

      const userId = userData.user.id;
      const isReacted = reactedPostIds.has(postId);

      if (isReacted) {
        const { error: delError } = await supabase
          .from("React")
          .delete()
          .match({ userId, postId });

        if (!delError) {
          await supabase
            .from("Post")
            .update({ likeCount: Math.max(0, currentLikeCount - 1) })
            .eq("id", postId);
          setPosts((prev) =>
            prev.map((post) =>
              post.id === postId
                ? { ...post, likeCount: Math.max(0, post.likeCount - 1) }
                : post,
            ),
          );
          setReactedPostIds((s) => {
            const copy = new Set(s);
            copy.delete(postId);
            return copy;
          });
        }
      } else {
        const { error: insError } = await supabase.from("React").insert({
          userId,
          postId,
        });

        if (!insError) {
          await supabase
            .from("Post")
            .update({ likeCount: currentLikeCount + 1 })
            .eq("id", postId);
          setPosts((prev) =>
            prev.map((post) =>
              post.id === postId
                ? { ...post, likeCount: post.likeCount + 1 }
                : post,
            ),
          );
          setReactedPostIds((s) => new Set(s).add(postId));
        }
      }
    } catch (caughtError) {
      setError("Unable to update reaction. Please try again.");
    } finally {
      setReactingIds((s) => {
        const copy = new Set(s);
        copy.delete(postId);
        return copy;
      });
    }
  };

  const handleToggleCommentInput = (postId: string) => {
    setCommentInputOpen((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  };

  const handleCommentChange = (postId: string, value: string) => {
    setCommentTextByPost((prev) => ({ ...prev, [postId]: value }));
  };

  const handleCommentSubmit = async (postId: string) => {
    const supabase = createClient();
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData?.user?.id) {
      setError("Please sign in to comment.");
      return;
    }
    const content = (commentTextByPost[postId] ?? "").trim();
    if (!content) {
      setError("Comment cannot be empty.");
      return;
    }
    const userId = userData.user.id;
    const userName = userData.user.email || userId;
    const { error } = await supabase.from("Comment").insert({
      content,
      postId,
      userId,
      userName,
    });
    if (error) {
      setError(error.message);
      return;
    }
    setCommentTextByPost((prev) => ({ ...prev, [postId]: "" }));
    setCommentInputOpen((prev) => {
      const next = new Set(prev);
      next.delete(postId);
      return next;
    });
    await loadComments(posts);
  };

  return (
    <div style={{ padding: 16, display: "flex", gap: 24 }}>
      <div style={{ flex: 1, maxWidth: 640 }}>
        <h1>Community</h1>
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <label>
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              style={{
                width: "100%",
                minHeight: 96,
                padding: 8,
                borderRadius: 6,
                border: "1px solid #ccc",
              }}
            />
          </label>
          <label>
            Image
            <input type="file" accept="image/*" onChange={handleImageChange} />
          </label>
          {imagePreview && (
            <img
              src={imagePreview}
              alt="preview"
              style={{
                width: "100%",
                maxHeight: 240,
                objectFit: "contain",
                borderRadius: 6,
                border: "1px solid #ddd",
              }}
            />
          )}
          {error && <p style={{ color: "crimson" }}>{error}</p>}
          <button type="submit" disabled={saving} style={buttonStyle}>
            {saving ? "Posting…" : "Post"}
          </button>
        </form>

        <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => setPostFilter("all")}
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              border: "1px solid #ccc",
              background: postFilter === "all" ? "#eef" : "white",
              cursor: "pointer",
            }}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setPostFilter("mine")}
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              border: "1px solid #ccc",
              background: postFilter === "mine" ? "#eef" : "white",
              cursor: "pointer",
            }}
          >
            My Posts
          </button>
          <button
            type="button"
            onClick={() => setPostFilter("reacted")}
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              border: "1px solid #ccc",
              background: postFilter === "reacted" ? "#eef" : "white",
              cursor: "pointer",
            }}
          >
            Reacted
          </button>
        </div>

        <section style={{ marginTop: 32 }}>
          <h2>Posts</h2>
          {loading ? (
            <p>Loading posts…</p>
          ) : posts.length === 0 ? (
            <p>No posts yet.</p>
          ) : filteredPosts.length === 0 ? (
            <p>No posts match this filter.</p>
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              {filteredPosts.map((post) => (
                <article
                  key={post.id}
                  style={{
                    padding: 12,
                    border: "1px solid #eee",
                    borderRadius: 8,
                  }}
                >
                  <p style={{ margin: "0 0 8px" }}>{post.description}</p>
                  {post.image && (
                    <img
                      src={post.image}
                      alt="post"
                      style={{
                        width: "100%",
                        maxHeight: 320,
                        objectFit: "contain",
                        borderRadius: 6,
                        marginBottom: 8,
                      }}
                    />
                  )}
                  <div style={{ fontSize: "0.9rem", color: "#555" }}>
                    <span>Likes: {post.likeCount}</span>
                    <span style={{ marginLeft: 12 }}>By: {post.userId}</span>
                    <span style={{ marginLeft: 12 }}>
                      At: {new Date(post.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <button
                      type="button"
                      onClick={() => toggleReact(post.id, post.likeCount)}
                      disabled={reactingIds.has(post.id)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: "1px solid #ccc",
                        background: reactedPostIds.has(post.id)
                          ? "#ffdddd"
                          : "white",
                        color: reactedPostIds.has(post.id) ? "#c00" : "#000",
                        cursor: reactingIds.has(post.id) ? "wait" : "pointer",
                      }}
                    >
                      {reactingIds.has(post.id)
                        ? "..."
                        : reactedPostIds.has(post.id)
                          ? "Reacted"
                          : "React"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleCommentInput(post.id)}
                      style={{
                        marginLeft: 12,
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: "1px solid #ccc",
                        background: commentInputOpen.has(post.id)
                          ? "#eef"
                          : "white",
                        cursor: "pointer",
                      }}
                    >
                      Comment (
                      {comments.filter((c) => c.postId === post.id).length})
                    </button>
                  </div>
                  {commentInputOpen.has(post.id) && (
                    <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                      <textarea
                        value={commentTextByPost[post.id] ?? ""}
                        onChange={(event) =>
                          handleCommentChange(post.id, event.target.value)
                        }
                        placeholder="Write a comment..."
                        style={{
                          width: "100%",
                          minHeight: 80,
                          padding: 8,
                          borderRadius: 6,
                          border: "1px solid #ccc",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleCommentSubmit(post.id)}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 6,
                          border: "1px solid #ccc",
                          background: "white",
                          cursor: "pointer",
                          alignSelf: "start",
                        }}
                      >
                        Submit comment
                      </button>
                    </div>
                  )}
                  {comments.filter((c) => c.postId === post.id).length > 0 && (
                    <div
                      style={{
                        marginTop: 16,
                        borderTop: "1px solid #eee",
                        paddingTop: 12,
                        display: "grid",
                        gap: 10,
                      }}
                    >
                      {comments
                        .filter((c) => c.postId === post.id)
                        .map((comment) => (
                          <div
                            key={comment.id}
                            style={{
                              padding: 10,
                              border: "1px solid #f0f0f0",
                              borderRadius: 6,
                              background: "#fafafa",
                            }}
                          >
                            <div
                              style={{
                                fontSize: "0.85rem",
                                color: "#555",
                                marginBottom: 6,
                              }}
                            >
                              {comment.userName}
                            </div>
                            <div style={{ fontSize: "0.95rem" }}>
                              {comment.content}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <aside style={{ width: 300 }}>
        <h2>Top Contributors</h2>
        {loadingContributors ? (
          <p>Loading…</p>
        ) : contributors.length === 0 ? (
          <p>No contributors yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {contributors.map((c) => (
              <div
                key={c.id}
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  padding: 8,
                  border: "1px solid #eee",
                  borderRadius: 8,
                }}
              >
                <img
                  src={`https://placehold.co/48x48?text=${encodeURIComponent((c.name || "U")[0].toUpperCase())}`}
                  alt="avatar"
                  style={{ width: 48, height: 48, borderRadius: 999 }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: "0.85rem", color: "#666" }}>
                    {c.role ?? "-"}
                  </div>
                </div>
                <div style={{ fontWeight: 700 }}>{c.count}</div>
              </div>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: "10px 14px",
  border: "1px solid #ccc",
  borderRadius: 6,
  background: "white",
  cursor: "pointer",
};
