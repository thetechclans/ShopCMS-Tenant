import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { ArrowLeft, ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";
import { PublicNavBar } from "@/components/PublicNavBar";
import { PublicFooter } from "@/components/PublicFooter";
import DynamicHead from "@/components/DynamicHead";
import { useTenant } from "@/contexts/TenantContext";

interface ProductImage {
  id: string;
  image_url: string;
  alt_text: string | null;
  display_order: number;
}

interface ProductVideo {
  video_url: string;
  thumbnail_url: string | null;
}

interface ProductAttribute {
  attribute_key: string;
  attribute_value: string;
  display_order: number;
}

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  category_id: string | null;
  is_published: boolean;
  whatsapp_enabled: boolean;
}

type MediaItem = 
  | { type: 'image'; data: ProductImage }
  | { type: 'video'; data: ProductVideo };

const ProductDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { tenant } = useTenant();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [video, setVideo] = useState<ProductVideo | null>(null);
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [whatsappNumber, setWhatsappNumber] = useState<string | null>(null);

  useEffect(() => {
    if (slug && tenant?.id) {
      fetchProductDetails();
    }
  }, [slug, tenant?.id]);

  useEffect(() => {
    // Build media items array from images and video
    const items: MediaItem[] = [];
    
    images.forEach(img => {
      items.push({ type: 'image', data: img });
    });
    
    if (video) {
      items.push({ type: 'video', data: video });
    }
    
    setMediaItems(items);
  }, [images, video]);

  const fetchProductDetails = async () => {
    if (!tenant?.id) return;
    
    try {
      // Fetch product
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("slug", slug)
        .eq("tenant_id", tenant.id)
        .eq("is_published", true)
        .maybeSingle();

      if (productError || !productData) {
        setLoading(false);
        return;
      }

      setProduct(productData);

      // Fetch category if exists
      if (productData.category_id) {
        const { data: categoryData } = await supabase
          .from("categories")
          .select("id, name")
          .eq("id", productData.category_id)
          .single();
        
        if (categoryData) {
          setCategory(categoryData);
        }
      }

      // Fetch images
      const { data: imagesData } = await supabase
        .from("product_images")
        .select("*")
        .eq("product_id", productData.id)
        .order("display_order", { ascending: true });

      if (imagesData) {
        setImages(imagesData);
      }

      // Fetch video
      const { data: videoData } = await supabase
        .from("product_videos")
        .select("video_url, thumbnail_url")
        .eq("product_id", productData.id)
        .maybeSingle();

      if (videoData) {
        setVideo(videoData);
      }

      // Fetch attributes
      const { data: attributesData } = await supabase
        .from("product_attributes")
        .select("attribute_key, attribute_value, display_order")
        .eq("product_id", productData.id)
        .order("display_order", { ascending: true });

      if (attributesData) {
        setAttributes(attributesData);
      }

      // Fetch WhatsApp number from public_shop_info
      if (productData.user_id) {
        const { data: profileData } = await supabase
          .from("public_shop_info")
          .select("whatsapp_number")
          .eq("id", productData.user_id)
          .maybeSingle();

        if (profileData?.whatsapp_number) {
          setWhatsappNumber(profileData.whatsapp_number);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error("Error fetching product:", error);
      setLoading(false);
    }
  };

  const handlePrevMedia = () => {
    setSelectedMediaIndex(prev => 
      prev === 0 ? mediaItems.length - 1 : prev - 1
    );
  };

  const handleNextMedia = () => {
    setSelectedMediaIndex(prev => 
      prev === mediaItems.length - 1 ? 0 : prev + 1
    );
  };

  const isYouTubeUrl = (url: string) => {
    return url.includes('youtube.com') || url.includes('youtu.be');
  };

  const getYouTubeEmbedUrl = (url: string) => {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)?.[1];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  };

  const handleWhatsAppClick = () => {
    if (!whatsappNumber || !product) return;
    
    const productUrl = `${window.location.origin}/product/${product.slug}`;
    const message = `Hi! I'm interested in ${product.name}. ${productUrl}`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <h1 className="text-2xl font-bold mb-4">Product not found</h1>
        <Button onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>
      </div>
    );
  }

  const selectedMedia = mediaItems[selectedMediaIndex];
  const mainImage = images[0];

  return (
    <>
      <DynamicHead />
      <Helmet>
        <title>{product.name} - Shop</title>
        <meta name="description" content={product.description || `View ${product.name}`} />
        {mainImage && <meta property="og:image" content={mainImage.image_url} />}
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col">
        <PublicNavBar />

        <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
          <div className="mb-6">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Left Column: Media Gallery */}
            <div className="space-y-4">
              {/* Main Media Viewer */}
              <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                {mediaItems.length > 0 ? (
                  <>
                    {selectedMedia?.type === 'image' ? (
                      <img
                        src={selectedMedia.data.image_url}
                        alt={selectedMedia.data.alt_text || product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : selectedMedia?.type === 'video' ? (
                      isYouTubeUrl(selectedMedia.data.video_url) ? (
                        <iframe
                          src={getYouTubeEmbedUrl(selectedMedia.data.video_url)}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <video
                          src={selectedMedia.data.video_url}
                          controls
                          className="w-full h-full"
                        />
                      )
                    ) : null}

                    {/* Navigation Arrows */}
                    {mediaItems.length > 1 && (
                      <>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="absolute left-4 top-1/2 -translate-y-1/2 opacity-80 hover:opacity-100"
                          onClick={handlePrevMedia}
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="absolute right-4 top-1/2 -translate-y-1/2 opacity-80 hover:opacity-100"
                          onClick={handleNextMedia}
                        >
                          <ChevronRight className="h-5 w-5" />
                        </Button>
                      </>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    No image available
                  </div>
                )}
              </div>

              {/* Thumbnails Strip */}
              {mediaItems.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {mediaItems.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedMediaIndex(index)}
                      className={`flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 transition-colors ${
                        selectedMediaIndex === index
                          ? 'border-primary'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      {item.type === 'image' ? (
                        <img
                          src={item.data.image_url}
                          alt={item.data.alt_text || ''}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                          Video
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Product Information */}
            <div className="space-y-6">
              {/* Product Name & Category */}
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">{product.name}</h1>
                {category && (
                  <Badge variant="secondary" className="mb-4">
                    {category.name}
                  </Badge>
                )}
              </div>

              {/* Description */}
              {product.description && (
                <div className="prose prose-sm max-w-none">
                  <p className="text-foreground whitespace-pre-wrap">{product.description}</p>
                </div>
              )}

              {/* WhatsApp Button */}
              {whatsappNumber && product.whatsapp_enabled && (
                <Button 
                  onClick={handleWhatsAppClick}
                  size="lg"
                  className="w-full"
                >
                  <MessageCircle className="h-5 w-5 mr-2" />
                  Chat on WhatsApp
                </Button>
              )}

              {/* Attributes/Specifications */}
              {attributes.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <h2 className="text-lg font-semibold mb-4">Product Details</h2>
                    <Table>
                      <TableBody>
                        {attributes.map((attr, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium w-1/3">
                              {attr.attribute_key}
                            </TableCell>
                            <TableCell>{attr.attribute_value}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>

        <PublicFooter />
      </div>
    </>
  );
};

export default ProductDetail;
