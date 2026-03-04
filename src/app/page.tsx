import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, ClipboardCheck, Activity } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A3161] via-[#0e3d73] to-[#1a5276]">
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-24 pb-20">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 mb-8">
            <div className="w-2 h-2 rounded-full bg-[#2dd4bf] animate-pulse" />
            <span className="text-white/80 text-sm font-medium">MedTech Data Platform Demo</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            AcuityMD Infrastructure Platform
            <br />
            <span className="text-[#2dd4bf]">For Medtech Data</span>
          </h1>
          <p className="text-xl text-white/70 mb-10 max-w-2xl mx-auto">
            Visualize product approvals, track FDA processes, and analyze
            market penetration across regions. Built with Next.js, TypeScript, Recharts, and Tailwind.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/dashboard">
              <Button size="lg" className="gap-2 bg-[#2dd4bf] text-[#0A3161] hover:bg-[#14b8a6] font-semibold text-base px-8">
                Open Dashboard <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="outline" className="gap-2 border-white/30 text-white hover:bg-white/10 font-semibold text-base px-8">
                Try Demo <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
            <div className="bg-[#2dd4bf]/20 w-14 h-14 rounded-xl flex items-center justify-center mb-5">
              <BarChart3 className="w-7 h-7 text-[#2dd4bf]" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Market Penetration Dashboard</h3>
            <p className="text-white/60">
              Interactive bar charts showing unit sales across North America, Europe, Asia Pacific, and Latin America
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
            <div className="bg-[#2dd4bf]/20 w-14 h-14 rounded-xl flex items-center justify-center mb-5">
              <ClipboardCheck className="w-7 h-7 text-[#2dd4bf]" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Approval Timeline Tracking</h3>
            <p className="text-white/60">
              Visual timeline of FDA approval stages from submission through review to approval with delay alerts
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
            <div className="bg-[#2dd4bf]/20 w-14 h-14 rounded-xl flex items-center justify-center mb-5">
              <Activity className="w-7 h-7 text-[#2dd4bf]" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">FDA Process Monitoring</h3>
            <p className="text-white/60">
              Real-time status tracking for medical device approvals with automated alerting for overdue stages
            </p>
          </div>
        </div>
      </div>

      {/* Tech Stack Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-wrap justify-center gap-3">
          {["Next.js", "TypeScript", "Recharts", "Tailwind CSS"].map((tech) => (
            <span
              key={tech}
              className="px-4 py-2 bg-white/10 rounded-full text-sm font-medium text-white/80 border border-white/10"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center border-t border-white/10">
        <p className="text-white/40">AcuityMD Demo &mdash; Built by Michael Abdo</p>
      </footer>
    </div>
  );
}
