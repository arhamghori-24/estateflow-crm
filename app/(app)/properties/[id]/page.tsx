import { notFound } from "next/navigation";
import Image from "next/image";
import { requireUser } from "@/lib/auth";
import { getProperty } from "@/lib/db/properties";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { MapPin, Bed, Bath, Maximize2, Building, IndianRupee } from "lucide-react";
import { PropertyImageUploader } from "@/components/properties/property-image-uploader";
import { ShareLinkCard } from "@/components/properties/share-link-card";

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile } = await requireUser();
  const property = await getProperty(profile.organization_id, id);
  if (!property) notFound();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const images = (property.property_images ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">{property.title}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{property.location}</p>
        </div>
        <Badge variant={property.status === "available" ? "success" : "warning"} className="capitalize">{property.status}</Badge>
      </div>

      {images.length > 0 && (
        <Card className="overflow-hidden p-0">
          <div className="relative aspect-video bg-muted">
            <Image src={images[0].url} alt={property.title} fill className="object-cover" priority sizes="(max-width: 768px) 100vw, 50vw" />
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <Stat icon={IndianRupee} label="Price" value={formatCurrency(property.price)} />
              <Stat icon={Maximize2} label="Size" value={property.size_sqft ? `${property.size_sqft} sqft` : "—"} />
              <Stat icon={Bed} label="Bedrooms" value={property.bedrooms ?? "—"} />
              <Stat icon={Bath} label="Bathrooms" value={property.bathrooms ?? "—"} />
            </CardContent>
          </Card>

          {property.description && (
            <Card>
              <CardHeader><CardTitle>Description</CardTitle></CardHeader>
              <CardContent className="whitespace-pre-wrap text-sm">{property.description}</CardContent>
            </Card>
          )}

          {property.amenities?.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Amenities</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {property.amenities.map((a: string) => <Badge key={a} variant="outline">{a}</Badge>)}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Photos</CardTitle></CardHeader>
            <CardContent>
              <PropertyImageUploader
                propertyId={property.id}
                organizationId={profile.organization_id}
                existingImages={images}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <ShareLinkCard shareToken={property.share_token} />
          <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Type"><span className="capitalize">{property.property_type}</span></Row>
              <Separator />
              <Row label="Floor"><span>{property.floor ?? "—"}</span></Row>
              <Separator />
              <Row label="Furnishing"><span>{property.furnishing ?? "—"}</span></Row>
              <Separator />
              <Row label="Developer"><span>{property.developer_name ?? "—"}</span></Row>
              {property.address && <><Separator /><Row label="Address"><span className="text-right">{property.address}</span></Row></>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode }) {
  return (
    <div>
      <Icon className="h-4 w-4 mx-auto text-muted-foreground" />
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold text-sm">{value}</p>
    </div>
  );
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span>{children}</div>;
}
