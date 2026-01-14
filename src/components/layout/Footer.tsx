import { Link } from "react-router-dom";
import logo from "@/assets/tawthef-logo-en.png";

const Footer = () => {
  const footerLinks = {
    product: [
      { name: "Features", href: "#" },
      { name: "Pricing", href: "#pricing" },
      { name: "How It Works", href: "#how-it-works" },
      { name: "API", href: "#" },
    ],
    company: [
      { name: "About", href: "#" },
      { name: "Careers", href: "#" },
      { name: "Blog", href: "#" },
      { name: "Contact", href: "#" },
    ],
    resources: [
      { name: "Documentation", href: "#" },
      { name: "Help Center", href: "#" },
      { name: "Partners", href: "#" },
      { name: "Community", href: "#" },
    ],
    legal: [
      { name: "Privacy", href: "#" },
      { name: "Terms", href: "#" },
      { name: "Security", href: "#" },
      { name: "GDPR", href: "#" },
    ],
  };

  return (
    <footer className="bg-sidebar text-sidebar-foreground relative overflow-hidden">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30 -z-10" />
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-[hsl(255,60%,55%)]/5 -z-10" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 lg:gap-14">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="inline-block">
              <img src={logo} alt="Tawthef" className="h-14 w-auto brightness-0 invert opacity-90" />
            </Link>
            <p className="mt-8 text-sm text-sidebar-foreground/50 max-w-xs leading-relaxed font-light">
              The enterprise recruitment platform that brings structure, transparency, and AI to hiring.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold mb-6 text-sidebar-foreground/80 text-sm tracking-wide">Product</h3>
            <ul className="space-y-4">
              {footerLinks.product.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-sm text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors font-light"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-6 text-sidebar-foreground/80 text-sm tracking-wide">Company</h3>
            <ul className="space-y-4">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-sm text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors font-light"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-6 text-sidebar-foreground/80 text-sm tracking-wide">Resources</h3>
            <ul className="space-y-4">
              {footerLinks.resources.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-sm text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors font-light"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-6 text-sidebar-foreground/80 text-sm tracking-wide">Legal</h3>
            <ul className="space-y-4">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-sm text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors font-light"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-20 pt-10 border-t border-sidebar-border/30 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-sm text-sidebar-foreground/40 font-light">
            © {new Date().getFullYear()} Tawthef. All rights reserved.
          </p>
          <div className="flex items-center space-x-10">
            <a href="#" className="text-sm text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors font-light">
              LinkedIn
            </a>
            <a href="#" className="text-sm text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors font-light">
              Twitter
            </a>
            <a href="#" className="text-sm text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors font-light">
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
