import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function ContactsPage() {
  return (
    <div className="px-4 sm:px-6 py-4 sm:py-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contacts</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your contact lists.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Contact
        </Button>
      </div>

      <div className="mt-8 flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
        <p className="text-muted-foreground">No contacts yet.</p>
        <Button variant="outline" size="sm" className="mt-4">
          Import contacts
        </Button>
      </div>
    </div>
  );
}
