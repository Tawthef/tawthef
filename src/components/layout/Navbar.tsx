import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import logo from "@/assets/tawthef-logo-en.png";
import { cn } from "@/lib/utils";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "How It Works", href: "#how-it-works" },
    { name: "For Employers", href: "#employers" },
    { name: "For Agencies", href: "#agencies" },
    { name: "Pricing", href: "#pricing" },
  ];

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-card/95 backdrop-blur-md border-b border-border/10 shadow-sm py-0"
          : "bg-transparent py-2"
      )}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 lg:h-[3.5rem] transition-all duration-300">
          {/* Logo - primary anchor */}
          <Link to="/" className="flex items-center">
            <img src={logo} alt="Tawthef" className="h-20 lg:h-24 w-auto transition-all duration-300" />
          </Link>

          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="px-3 py-1 text-[13px] font-medium text-foreground/70 hover:text-foreground transition-colors rounded-md hover:bg-muted/40"
              >
                {link.name}
              </a>
            ))}
          </div>

          {/* Desktop CTA */}
          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="font-medium text-[13px] text-foreground/70 hover:text-foreground h-8 px-2 transition-colors">Sign In</Button>
            </Link>
            <Link to="/register">
              <Button size="sm" className="font-semibold bg-primary hover:bg-primary/95 text-white text-[13px] h-8 px-4 rounded-md shadow-sm transition-all">Request Access</Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted/50 transition-colors"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden border-t border-border/30 py-6 animate-fade-in bg-card/95 backdrop-blur-premium -mx-4 px-4 rounded-b-2xl">
            <div className="flex flex-col space-y-1">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="px-4 py-3.5 text-base font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-xl transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  {link.name}
                </a>
              ))}
              <div className="flex flex-col gap-3 pt-6 mt-4 border-t border-border/30">
                <Link to="/login" onClick={() => setIsOpen(false)}>
                  <Button variant="ghost" className="w-full font-medium">Sign In</Button>
                </Link>
                <Link to="/register" onClick={() => setIsOpen(false)}>
                  <Button className="w-full font-medium">Get Started</Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
