import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface LoadingModalProps {
  isOpen: boolean;
  title: string;
  description: string;
}

export function LoadingModal({ isOpen, title, description }: LoadingModalProps) {
  return (
    <Dialog open={isOpen}>
      <DialogContent className="bg-dark-light border-surface max-w-sm">
        <div className="text-center py-4">
          <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="text-gray-400 text-sm">{description}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
