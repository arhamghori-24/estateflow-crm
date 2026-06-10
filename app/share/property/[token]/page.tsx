import { notFound } from "next/navigation";
import Image from "next/image";
import { getPropertyByShareToken } from "@/lib/db/properties";
import { formatCurrency } from "@/lib/utils";
import { MapPin, Bed, Bath, Maximize2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Public, unauthenticated property share page
export default async function PublicSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const property = await getPropertyByShareToken(token);
  if (!property) notFound();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const images: any[] = (property.property_images ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order);

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary text-primary-foreground py-3 px-4 text-center text-sm font-medium">
        Property shared via EstateFlow CRM
      </div>
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        {images.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2 relative aspect-video rounded-xl overflow-hidden bg-muted">
              <Image src={images[0].url} alt={property.title} fill className="object-cover" priority sizes="100vw" />
            </div>
            {images.slice(1, 5).map((img, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                <Image src={img.url} alt="" fill className="object-cover" sizes="50vw" />
              </div>
            ))}
          </div>
        ) : null}

        <div>
          <h1 className="text-2xl font-bold">{property.title}</h1>
          <p className="text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="h-4 w-4" />{property.location}</p>
          <p className="mt-3 text-3xl font-bold text-primary">{formatCurrency(property.price)}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {property.bedrooms ? <Badge variant="outline" className="text-sm py-1 px-3"><Bed className="h-3 w-3 mr-1" />{property.bedrooms} Bed</Badge> : null}
          {property.bathrooms ? <Badge variant="outline" className="text-sm py-1 px-3"><Bath className="h-3 w-3 mr-1" />{property.bathrooms} Bath</Badge> : null}
          {property.size_sqft ? <Badge variant="outline" className="text-sm py-1 px-3"><Maximize2 className="h-3 w-3 mr-1" />{property.size_sqft} sqft</Badge> : null}
          <Badge variant="outline" className="text-sm py-1 px-3 capitalize">{property.property_type}</Badge>
        </div>

        {property.description && (
          <div>
            <h2 className="text-lg font-semibold mb-1">Description</h2>
            <p className="text-sm whitespace-pre-wrap">{property.description}</p>
          </div>
        )}

        {property.amenities?.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-1">Amenities</h2>
            <div className="flex flex-wrap gap-2">
              {property.amenities.map((a: string) => <Badge key={a} variant="secondary">{a}</Badge>)}
            </div>
          </div>
        )}

        <div className="border-t pt-4 text-center text-xs text-muted-foreground">
          Powered by EstateFlow CRM
        </div>
      </div>
    </div>
  );
}
