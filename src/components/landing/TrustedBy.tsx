import { motion } from "framer-motion";

const brands = [
    "United Synagogues", "Orthodox Union", "Young Israel", "Chabad-Lubavitch", "Beth Sholom"
];

export default function TrustedBy() {
    return (
        <section className="py-12 border-y border-white/5 bg-white/5 backdrop-blur-sm relative z-20">
            <div className="max-w-7xl mx-auto px-6">
                <p className="text-center text-[10px] font-black text-blue-100/30 uppercase tracking-[0.3em] mb-8">
                    Trusted by leading communities worldwide
                </p>
                <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-30 grayscale hover:grayscale-0 transition-all duration-700">
                    {brands.map((brand, i) => (
                        <span key={i} className="text-2xl font-serif font-black text-white tracking-tighter">
                            {brand}
                        </span>
                    ))}
                </div>
            </div>
        </section>
    );
}
