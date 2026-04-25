import { Link } from "react-router-dom";
import { Linkedin, Instagram, Twitter } from "lucide-react";
import logo from "@/assets/tawthef-logo-en.png";

const socialLinks = [
  { icon: Linkedin,  label: "LinkedIn",  href: "#" },
  { icon: Instagram, label: "Instagram", href: "#" },
  { icon: Twitter,   label: "Twitter",   href: "#" },
];

const Footer = () => {
  const footerLinks = {
    product: [
      { name: "Browse Jobs", href: "/jobs" },
      { name: "Pricing", href: "/pricing" },
      { name: "Features", href: "/#intelligence" },
      { name: "How It Works", href: "/#how-it-works" },
    ],
    platform: [
      { name: "Sign In", href: "/login" },
      { name: "Register", href: "/register" },
      { name: "For Recruiters", href: "/register?role=recruiter" },
    ],
    legal: [
      { name: "Privacy Policy", href: "/privacy-policy" },
      { name: "Cookie Policy", href: "/cookie-policy" },
    ],
  };

  return (
    <footer className="bg-sidebar text-sidebar-foreground relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30 -z-10" />
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-[hsl(255,60%,55%)]/5 -z-10" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 lg:gap-14">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="inline-block">
              <img src={logo} alt="Tawthef" className="h-20 w-auto brightness-0 invert opacity-90" />
            </Link>
            <p className="mt-6 text-sm text-sidebar-foreground/50 max-w-xs leading-relaxed font-light">
              The enterprise recruitment platform that brings structure, transparency, and AI to hiring.
            </p>
            <div className="flex items-center gap-3 mt-6">
              {socialLinks.map(({ icon: Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 rounded-full border border-sidebar-foreground/15 flex items-center justify-center text-sidebar-foreground/40 hover:text-sidebar-foreground hover:border-sidebar-foreground/40 transition-all hover:scale-110"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-6 text-sidebar-foreground/80 text-sm tracking-wide">Product</h3>
            <ul className="space-y-4">
              {footerLinks.product.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors font-light"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-6 text-sidebar-foreground/80 text-sm tracking-wide">Platform</h3>
            <ul className="space-y-4">
              {footerLinks.platform.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors font-light"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-6 text-sidebar-foreground/80 text-sm tracking-wide">Legal</h3>
            <ul className="space-y-4">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors font-light"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-20 pt-10 border-t border-sidebar-border/30 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-sm text-sidebar-foreground/40 font-light">
            &copy; {new Date().getFullYear()} Tawthef. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
