import { motion } from "framer-motion";
import { Quote } from "lucide-react";

const testimonials = [
    {
        quote: "ShulGenius transformed how we handle our annual appeal. We saw a 30% increase in member engagement and our bookkeeping time was cut in half.",
        author: "Rabbi David Cohen",
        role: "Executive Director",
        shul: "Beth Israel Congregation"
    },
    {
        quote: "The interface is so intuitive even our older board members love using it. It's the first time our data has felt truly organized and accessible.",
        author: "Sarah Rosenbaum",
        role: "Office Administrator",
        shul: "Young Israel of Woodmere"
    },
    {
        quote: "The member portal is a game changer. Our congregants love being able to manage their own accounts and yahrzeits. Exceptional support too!",
        author: "Michael Goldstein",
        role: "Board President",
        shul: "Kehillat Jeshurun"
    }
];

export default function Testimonials() {
    return (
        <section id="testimonials" className="py-24 relative z-20 overflow-hidden">
            <div className="container max-w-7xl mx-auto px-6">
                <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
                    <h2 className="text-4xl md:text-5xl font-bold font-serif text-stone-900 leading-tight">
                        Loved by communities <br />
                        <span className="text-amber-600 uppercase tracking-widest text-sm font-black pt-2 block">across the globe.</span>
                    </h2>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {testimonials.map((t, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0.95 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-white/80 backdrop-blur-md p-8 rounded-2xl border border-stone-200 shadow-sm relative group hover:shadow-xl transition-all duration-300"
                        >
                            <Quote className="absolute top-6 right-8 w-10 h-10 text-stone-100 group-hover:text-stone-200 transition-colors" />
                            <div className="space-y-6 relative">
                                <p className="text-stone-700 leading-relaxed font-serif text-lg italic">
                                    "{t.quote}"
                                </p>
                                <div>
                                    <div className="font-bold text-stone-900 text-lg">{t.author}</div>
                                    <div className="text-sm font-bold text-stone-500 uppercase tracking-wider">{t.role}, {t.shul}</div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
