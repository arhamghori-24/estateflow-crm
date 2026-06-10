import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { MapPin, Bed, Bath, Maximize2 } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function PropertyCard({ property }: { property: any }) {
  const img = property.property_images?.[0]?.url ?? "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600";
  const statusVariant = property.status === "available" ? "success" : property.status === "sold" ? "destructive" : "warning";
  return (
    <Link href={`/properties/${property.id}`}>
      <Card className="overflow-hidden hover:shadow-md transition active:scale-[0.99]">
        <div className="relative h-40 bg-muted">
          <Image src={img} alt={property.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
          <Badge variant={statusVariant} className="absolute top-2 right-2 capitalize">{property.status}</Badge>
        </div>
        <div className="p-3 space-y-1.5">
          <p className="font-medium line-clamp-1">{property.title}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{property.location}</p>
          <p className="font-bold text-primary">{formatCurrency(property.price)}</p>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-1">
            {property.bedrooms ? <span className="flex items-center gap-1"><Bed className="h-3 w-3" />{property.bedrooms} bed</span> : null}
            {property.bathrooms ? <span className="flex items-center gap-1"><Bath className="h-3 w-3" />{property.bathrooms} bath</span> : null}
            {property.size_sqft ? <span className="flex items-center gap-1"><Maximize2 className="h-3 w-3" />{property.size_sqft} sqft</span> : null}
          </div>
        </div>
      </Card>
    </Link>
  );
}
