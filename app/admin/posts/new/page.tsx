import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PostForm from "@/components/admin/PostForm";

export default function NewPostPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">New Post</h1>
          <Link
            href="/admin/posts"
            className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </div>
        <PostForm />
      </div>
    </div>
  );
}
