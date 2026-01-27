import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import logo from "@/assets/tawthef-logo-en.png";
import { cn } from "@/lib/utils";

interface SidebarLogoProps {
    onMobileClose?: () => void;
    className?: string;
}

const SidebarLogo = ({ onMobileClose, className }: SidebarLogoProps) => {
    return (
        <div className={cn(
            "min-h-[5rem] lg:min-h-[6rem] flex items-center justify-between px-6 lg:px-8 border-b border-sidebar-border/30",
            className
        )}>
            <Link
                to="/"
                className="flex items-center justify-center transition-transform duration-300 hover:scale-105 block"
            >
                <img
                    src={logo}
                    alt="Tawthef"
                    className="h-10 lg:h-14 w-auto object-contain brightness-0 invert opacity-90"
                />
            </Link>

            {onMobileClose && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden text-sidebar-foreground hover:bg-sidebar-accent/50"
                    onClick={onMobileClose}
                >
                    <X className="w-5 h-5" />
                </Button>
            )}
        </div>
    );
};

export default SidebarLogo;
