import { PropertyForm } from "@/components/properties/property-form";

export default function NewPropertyPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-xl md:text-2xl font-bold">New Property</h1>
      <PropertyForm />
    </div>
  );
}
