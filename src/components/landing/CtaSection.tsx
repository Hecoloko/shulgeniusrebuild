import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function CtaSection() {
    return (
        <section className="py-24 relative z-20 px-6">
            <div className="max-w-5xl mx-auto bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-12 md:p-20 text-center relative overflow-hidden shadow-2xl border border-stone-200">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(250,204,21,0.05),transparent_70%)]" />
                <div className="relative space-y-8">
                    <h2 className="text-4xl md:text-6xl font-bold font-serif text-stone-900 leading-tight">
                        Ready to enhance <br />
                        your community?
                    </h2>
                    <p className="text-xl text-stone-600 max-w-2xl mx-auto leading-relaxed font-medium">
                        Join hundreds of forward-thinking synagogues that have modernised their operations with ShulGenius. Start your journey today.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                        {/* Blue color from screenshot on the CTA button */}
                        <Link to="/login" className="bg-[#1e3a8a] hover:bg-[#1e40af] text-white px-10 py-5 rounded-full font-bold text-xl flex items-center justify-center gap-2 shadow-xl transition-all hover:scale-105 active:scale-95">
                            Get Started Now <ArrowRight className="w-6 h-6" />
                        </Link>
                    </div>
                    <p className="text-stone-500 font-bold uppercase tracking-widest text-[10px] pt-4">
                        No credit card required. Free data migration included.
                    </p>
                </div>
            </div>
        </section>
    );
}
