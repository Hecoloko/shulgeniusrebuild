import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/80 backdrop-blur-md shadow-sm py-4 border-b border-stone-200" : "bg-transparent py-6"}`}>
            <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2 group">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-yellow-500 to-yellow-400 flex items-center justify-center text-white font-bold font-serif text-lg shadow-sm group-hover:shadow-md transition-all">S</div>
                    <span className="text-xl font-bold font-serif tracking-tight text-stone-900">Shul<span className="text-yellow-500">Genius</span></span>
                </Link>
                <nav className="hidden md:flex items-center gap-8">
                    <NavLink href="#features">Features</NavLink>
                    <NavLink href="#how-it-works">How it Works</NavLink>
                    <NavLink href="#testimonials">Testimonials</NavLink>
                    {/* Blue color from screenshot on the CTA button */}
                    <Link to="/login" className="bg-[#1e3a8a] hover:bg-[#1e40af] text-white px-6 py-2.5 rounded-full font-medium transition-all shadow-lg hover:scale-105 active:scale-95">Sign In</Link>
                </nav>
                <button onClick={() => setMobileMenuOpen(true)} className="md:hidden text-stone-900"><Menu className="w-6 h-6" /></button>
            </div>

            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: "100%" }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed inset-0 z-[60] bg-white p-6 flex flex-col md:hidden"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <Link to="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 group">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-yellow-500 to-yellow-400 flex items-center justify-center text-white font-bold font-serif text-lg">S</div>
                                <span className="text-xl font-bold font-serif tracking-tight text-stone-900">Shul<span className="text-yellow-600">Genius</span></span>
                            </Link>
                            <button onClick={() => setMobileMenuOpen(false)} className="text-stone-900"><X className="w-6 h-6" /></button>
                        </div>
                        <nav className="flex flex-col gap-6">
                            <MobileNavLink href="#features" onClick={() => setMobileMenuOpen(false)}>Features</MobileNavLink>
                            <MobileNavLink href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>How it Works</MobileNavLink>
                            <MobileNavLink href="#testimonials" onClick={() => setMobileMenuOpen(false)}>Testimonials</MobileNavLink>
                            <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="bg-[#1e3a8a] text-white px-6 py-4 rounded-xl font-semibold text-center mt-4">Sign In</Link>
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <a href={href} className="text-sm font-medium transition-colors hover:text-yellow-600 text-stone-600">
            {children}
        </a>
    );
}

function MobileNavLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
    return (
        <a href={href} onClick={onClick} className="text-2xl font-serif font-bold text-stone-900 border-b border-stone-100 pb-2">
            {children}
        </a>
    );
}
