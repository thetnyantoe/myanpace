"use client";

import { Heart, MessageCircle, Send, X } from "lucide-react";

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

type Props = {
  post: Post;
  comments: Comment[];
  commentText: string;
  onCommentChange: (value: string) => void;
  onSubmitComment: () => void;
  onClose: () => void;
  reacted: boolean;
  reacting: boolean;
  onToggleReact: () => void;
};

export default function PostPopup({
  post,
  comments,
  commentText,
  onCommentChange,
  onSubmitComment,
  onClose,
  reacted,
  reacting,
  onToggleReact,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-[150] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-3xl border border-[#d6d6d5] bg-[#f3f4f5] sm:max-w-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-[#d6d6d5] bg-white px-6 py-4">
          <h3 className="text-lg font-bold text-[#1d2846]">Post Details</h3>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d6d6d5] bg-[#f3f4f5] cursor-pointer"
          >
            <X className="size-4 text-[#1d2846]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="bg-white p-5 md:p-6">
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
                  className="max-h-[450px] w-full object-cover"
                />
              </div>
            )}

            <div className="mt-5 flex items-center gap-6 border-t border-[#d6d6d5] pt-4">
              <button
                onClick={onToggleReact}
                disabled={reacting}
                className="flex items-center gap-2 text-sm font-bold"
              >
                <Heart
                  className={`size-5 ${
                    reacted ? "fill-red-500 text-red-500" : "text-[#949492]"
                  }`}
                />

                <span className={reacted ? "text-red-500" : "text-[#949492]"}>
                  {post.likeCount}
                </span>
              </button>

              <div className="flex items-center gap-2 text-sm font-bold text-[#949492] cursor-pointer">
                <MessageCircle className="size-5" />

                {comments.length}
              </div>
            </div>
          </div>

          <div className="space-y-4 px-5 py-5 md:px-6">
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-[#949492]">
              Comments ({comments.length})
            </h4>

            {comments.length === 0 ? (
              <div className="rounded-2xl bg-white p-4 text-sm text-[#949492]">
                No comments yet.
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1d2846] text-xs font-bold text-white">
                    {comment.userName.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 rounded-2xl rounded-tl-none border border-[#d6d6d5] bg-white p-3.5">
                    <h5 className="text-xs font-bold text-[#1d2846]">
                      {comment.userName}
                    </h5>

                    <p className="mt-1 text-sm leading-relaxed text-[#1d2846]">
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex items-end gap-3 border-t border-[#d6d6d5] bg-white px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1d2846] text-xs font-bold text-white">
            U
          </div>

          <textarea
            rows={1}
            value={commentText}
            onChange={(e) => onCommentChange(e.target.value)}
            placeholder="Write a comment..."
            className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-[#d6d6d5] bg-[#f3f4f5] px-4 py-2.5 text-sm text-[#1d2846] outline-none placeholder:text-[#949492]"
          />

          <button
            onClick={onSubmitComment}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1d2846] text-white cursor-pointer"
          >
            <Send className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
