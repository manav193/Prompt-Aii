import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import HowItWorks from "@/components/landing/HowItWorks";
import Models from "@/components/landing/Models";
import Pricing from "@/components/landing/Pricing";
import Waitlist from "@/components/landing/Waitlist";
import FAQ from "@/components/landing/FAQ";
import Contact from "@/components/landing/Contact";

export default function Landing() {
  return (
    <div className="relative min-h-screen bg-[#050816] text-white" data-testid="landing-page">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Models />
        <Pricing />
        <Waitlist />
        <FAQ />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
