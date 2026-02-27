import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  loading: boolean;
  onSubmit: (firstName: string, lastName: string) => void;
}

const ViewerNameModal = ({ open, loading, onSubmit }: Props) => {
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");

  const valid = first.trim().length > 0 && last.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (valid) onSubmit(first.trim(), last.trim());
  };

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            Welcome to Hawks Baseball! ⚾
          </DialogTitle>
          <DialogDescription className="text-center">
            Tell us your name so we can personalize your experience.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="first-name">First name</Label>
            <Input
              id="first-name"
              placeholder="e.g. Mike"
              maxLength={50}
              value={first}
              onChange={(e) => setFirst(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last-name">Last name</Label>
            <Input
              id="last-name"
              placeholder="e.g. Trout"
              maxLength={50}
              value={last}
              onChange={(e) => setLast(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={!valid || loading}>
            {loading ? "Saving…" : "Let's Go!"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ViewerNameModal;
