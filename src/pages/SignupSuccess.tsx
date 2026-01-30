import { motion } from "framer-motion";
import { Mail, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function SignupSuccess() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-lg">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="bg-card border border-border/50 rounded-2xl shadow-xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-br from-royal via-royal-light to-royal-dark p-8 text-center relative overflow-hidden">
                        {/* Decorative elements */}
                        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20">
                            <div className="absolute top-10 left-10 w-32 h-32 bg-gold rounded-full blur-2xl" />
                            <div className="absolute bottom-10 right-10 w-24 h-24 bg-white rounded-full blur-2xl" />
                        </div>

                        <div className="relative z-10 flex flex-col items-center">
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gold to-gold-light flex items-center justify-center shadow-glow-gold mb-6"
                            >
                                <Mail className="w-10 h-10 text-royal-dark" />
                            </motion.div>
                            <h1 className="text-3xl font-bold text-white mb-2">Check Your Email</h1>
                            <p className="text-white/80">Your Shul is Ready!</p>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-8 text-center space-y-6">
                        <div className="space-y-4">
                            <p className="text-lg text-foreground">
                                We've sent a welcome email to your inbox with important links for your new shul.
                            </p>

                            <div className="bg-muted/50 rounded-xl p-6 border border-border/50 text-left">
                                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-gold" />
                                    What's in the email?
                                </h3>
                                <ul className="space-y-3 text-muted-foreground text-sm">
                                    <li className="flex items-start gap-3">
                                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                        <span>Link to your <strong>Admin Dashboard</strong> (to manage payments & members)</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                        <span>Link to your <strong>Public Member Portal</strong> (for your members)</span>
                                    </li>
                                </ul>
                            </div>

                            <p className="text-muted-foreground text-sm">
                                Please check your email and click the link to sign in to your dashboard.
                            </p>
                        </div>

                        <div className="pt-4">
                            <Link
                                to="/login"
                                className="btn-ghost inline-flex items-center gap-2 group"
                            >
                                Back to Sign In
                                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                            </Link>
                        </div>
                    </div>
                </motion.div>

                {/* Footer */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-center text-muted-foreground mt-8 text-sm"
                >
                    Didn't receive the email? Check your spam folder.
                </motion.p>
            </div>
        </div>
    );
}
