import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

const steps = [
    {
        title: "Onboard Your Community",
        desc: "Import your existing member database with one click. Our smart filters automatically categorize families, yahrzeits, and seating preferences.",
    },
    {
        title: "Sync Your Finances",
        desc: "Connect your bank account or payment processor. ShulGenius automatically generates recurring dues and pledges based on your historical records.",
    },
    {
        title: "Engage Your Members",
        desc: "Launch your custom member portal. Families can manage their own profiles, view balances, and contribute to drives instantly from any device.",
    }
];

export default function HowItWorks() {
    return (
        <section id="how-it-works" className="py-24 relative z-20 overflow-hidden">
            <div className="container max-w-7xl mx-auto px-6">
                <div className="flex flex-col lg:flex-row gap-20 items-center">
                    <div className="lg:w-1/2 space-y-8">
                        <h2 className="text-4xl md:text-5xl font-bold font-serif text-stone-900 leading-tight">
                            A smooth transition to <br />
                            <span className="text-yellow-600">modern management.</span>
                        </h2>
                        <p className="text-lg text-stone-600 leading-relaxed font-medium">
                            We know that moving your community's data is a big step. ShulGenius is designed to make the process effortless, with dedicated support at every stage of your migration.
                        </p>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="w-5 h-5 text-yellow-600" />
                                <span className="font-bold text-stone-800">No manual data entry required</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="w-5 h-5 text-yellow-600" />
                                <span className="font-bold text-stone-800">Legacy system integration</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="w-5 h-5 text-yellow-600" />
                                <span className="font-bold text-stone-800">Dedicated migration consultant</span>
                            </div>
                        </div>
                    </div>

                    <div className="lg:w-1/2 relative">
                        <div className="absolute left-[23px] top-6 bottom-6 w-px bg-stone-200 hidden md:block" />
                        <div className="space-y-12">
                            {steps.map((step, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: 20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="flex gap-6 relative"
                                >
                                    {/* Using precise Deep Navy from screenshot for step numbers */}
                                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#1e3a8a] text-white flex items-center justify-center font-black font-serif relative z-10 shadow-xl border-4 border-white">
                                        {i + 1}
                                    </div>
                                    <div className="pt-2">
                                        <h3 className="text-xl font-bold text-stone-900 mb-2 font-serif">{step.title}</h3>
                                        <p className="text-stone-600 leading-relaxed text-sm font-medium">
                                            {step.desc}
                                        </p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
