import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileText, Shield, Zap } from "lucide-react";
import { pagePath, apiPath } from "@/lib/utils/path-utils";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-20 pb-16">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Document Processing Template
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            A production-ready Next.js template for document upload, processing, and comparison.
            Built with TypeScript, Tailwind CSS, and enterprise-grade security.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href={pagePath("/sign-in")}>
              <Button size="lg" className="gap-2">
                Get Started <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href={apiPath("/health")}>
              <Button size="lg" variant="outline">
                Check API Status
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Document Processing</h3>
            <p className="text-gray-600">
              Upload and process PDF, DOCX, and TXT files with automatic text extraction
            </p>
          </div>
          <div className="text-center">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Enterprise Security</h3>
            <p className="text-gray-600">
              Azure AD authentication, secure storage, and comprehensive audit logging
            </p>
          </div>
          <div className="text-center">
            <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Production Ready</h3>
            <p className="text-gray-600">
              DRY architecture, comprehensive error handling, and automated testing
            </p>
          </div>
        </div>
      </div>

      {/* Tech Stack Section */}
      <div className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8">Built With Modern Technologies</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              "Next.js 15",
              "TypeScript 5",
              "Tailwind CSS",
              "Radix UI",
              "NextAuth.js",
              "MySQL",
              "AWS S3",
              "OpenAI API"
            ].map((tech) => (
              <span
                key={tech}
                className="px-4 py-2 bg-white rounded-full text-sm font-medium text-gray-700 shadow-sm"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center text-gray-600">
        <p>VVG Template - A clean slate for your next project</p>
      </footer>
    </div>
  );
}