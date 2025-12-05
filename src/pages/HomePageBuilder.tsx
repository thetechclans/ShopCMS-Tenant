import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Edit, Menu as MenuIcon, Save, Plus, Trash2, ArrowUp, ArrowDown, Type, Grid3x3 } from "lucide-react";
import { HomePageCarousel } from "@/components/HomePageCarousel";
import { CarouselEditor } from "@/components/CarouselEditor";
import { MenuEditor } from "@/components/MenuEditor";
import { FooterEditor } from "@/components/FooterEditor";
import { NavBarEditor } from "@/components/NavBarEditor";
import { CategorySection } from "@/components/CategorySection";
import { CategorySectionEditor, CategorySectionData } from "@/components/CategorySectionEditor";
import { TextSection } from "@/components/TextSection";
import { TextSectionEditor, TextSectionData } from "@/components/TextSectionEditor";
import { PublicFooter } from "@/components/PublicFooter";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useHomePageData } from "@/hooks/useHomePageData";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type PageSection = CategorySectionData | TextSectionData;

const HomePageBuilder = () => {
  const { slides, categories, isLoading } = useHomePageData();
  const [carouselEditorOpen, setCarouselEditorOpen] = useState(false);
  const [menuEditorOpen, setMenuEditorOpen] = useState(false);
  const [navBarEditorOpen, setNavBarEditorOpen] = useState(false);
  const [footerEditorOpen, setFooterEditorOpen] = useState(false);
  const [categorySectionEditorOpen, setCategorySectionEditorOpen] = useState(false);
  const [textSectionEditorOpen, setTextSectionEditorOpen] = useState(false);
  const [isDraft, setIsDraft] = useState(true);
  const [sections, setSections] = useState<PageSection[]>([]);
  const [editingSection, setEditingSection] = useState<{ index: number; data: PageSection } | null>(null);
  const [pageId, setPageId] = useState<string | null>(null);
  const { tenantId } = useTenant();

  useEffect(() => {
    if (tenantId) {
      loadHomePage();
    }
  }, [tenantId]);

  const loadHomePage = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !tenantId) return;

    const { data, error } = await supabase
      .from("pages")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("user_id", user.id)
      .eq("slug", "home")
      .single();

    if (data) {
      setPageId(data.id);
      setIsDraft(!data.is_published);
      if (data.content) {
        try {
          const parsedSections = JSON.parse(data.content);
          setSections(parsedSections);
        } catch (e) {
          console.error("Failed to parse page content", e);
        }
      }
    }
  };

  const saveToDatabase = async (sectionsToSave: PageSection[], publish: boolean = false) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !tenantId) return;

    const pageData = {
      user_id: user.id,
      tenant_id: tenantId,
      title: "Home Page",
      slug: "home",
      content: JSON.stringify(sectionsToSave),
      is_published: publish,
    };

    if (pageId) {
      const { error } = await supabase
        .from("pages")
        .update(pageData)
        .eq("id", pageId)
        .eq("tenant_id", tenantId);

      if (error) {
        toast.error("Failed to save page");
        console.error(error);
      }
    } else {
      const { data, error } = await supabase
        .from("pages")
        .insert(pageData)
        .select()
        .single();

      if (error) {
        toast.error("Failed to create page");
        console.error(error);
      } else if (data) {
        setPageId(data.id);
      }
    }
  };

  const handlePublish = async () => {
    await saveToDatabase(sections, true);
    toast.success("Home page published successfully!");
    setIsDraft(false);
  };

  const handleSaveDraft = async () => {
    await saveToDatabase(sections, false);
    toast.success("Draft saved");
    setIsDraft(true);
  };

  const handleAddSection = (type: "category" | "text") => {
    if (type === "category") {
      setCategorySectionEditorOpen(true);
      setEditingSection(null);
    } else {
      setTextSectionEditorOpen(true);
      setEditingSection(null);
    }
  };

  const handleEditSection = (index: number, section: PageSection) => {
    setEditingSection({ index, data: section });
    if (section.type === "category") {
      setCategorySectionEditorOpen(true);
    } else {
      setTextSectionEditorOpen(true);
    }
  };

  const handleSaveSection = (data: PageSection) => {
    if (editingSection !== null) {
      const newSections = [...sections];
      newSections[editingSection.index] = data;
      setSections(newSections);
    } else {
      setSections([...sections, data]);
    }
    setEditingSection(null);
    toast.success("Section saved");
  };

  const handleDeleteSection = (index: number) => {
    setSections(sections.filter((_, i) => i !== index));
    toast.success("Section deleted");
  };

  const moveSection = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === sections.length - 1)
    ) {
      return;
    }

    const newSections = [...sections];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];
    setSections(newSections);
  };

  return (
    <div className="space-y-6">
      {/* Loading State */}
      {isLoading && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-9 w-64 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-32" />
          </div>
          <Skeleton className="h-96 w-full rounded-lg" />
        </div>
      )}

      {!isLoading && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Home Page Builder</h1>
            <Badge variant={isDraft ? "secondary" : "default"}>
              {isDraft ? "Draft" : "Published"}
            </Badge>
          </div>
          <p className="text-muted-foreground">Build and customize your shop's home page</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSaveDraft}>
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button onClick={handlePublish}>
            Publish
          </Button>
        </div>
      </div>

      {/* Edit Controls */}
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" onClick={() => setMenuEditorOpen(true)}>
          <MenuIcon className="h-4 w-4 mr-2" />
          Edit Menu
        </Button>
        <Button variant="outline" onClick={() => setNavBarEditorOpen(true)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit NavBar
        </Button>
        <Button variant="outline" onClick={() => setCarouselEditorOpen(true)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Carousel
        </Button>
        <Button variant="outline" onClick={() => setFooterEditorOpen(true)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Footer
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Section
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handleAddSection("category")}>
              <Grid3x3 className="h-4 w-4 mr-2" />
              Category Section
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAddSection("text")}>
              <Type className="h-4 w-4 mr-2" />
              Text Section
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Live Preview */}
      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Hero Carousel</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCarouselEditorOpen(true)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
            <HomePageCarousel slides={slides} isLoading={false} />
          </div>

          {/* Dynamic Sections */}
          {sections.map((section, index) => (
            <div key={index} className="relative group">
              <div className="absolute top-2 right-2 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => moveSection(index, "up")}
                  disabled={index === 0}
                  title="Move up"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => moveSection(index, "down")}
                  disabled={index === sections.length - 1}
                  title="Move down"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleEditSection(index, section)}
                  title="Edit section"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDeleteSection(index)}
                  title="Delete section"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {section.type === "category" && (
                <CategorySection
                  title={section.title}
                  subtitle={section.subtitle}
                  titleColor={section.titleColor}
                  subtitleColor={section.subtitleColor}
                  backgroundColor={section.backgroundColor}
                  categories={categories}
                />
              )}
              {section.type === "text" && (
                <TextSection
                  content={section.content}
                  textColor={section.textColor}
                  backgroundColor={section.backgroundColor}
                  textAlign={section.textAlign}
                  fontSize={section.fontSize}
                  fontWeight={section.fontWeight}
                />
              )}
            </div>
          ))}

          {sections.length === 0 && (
            <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
              <h3 className="text-lg font-medium mb-2">No Sections Yet</h3>
              <p className="text-muted-foreground mb-4">
                Start building your home page by adding sections above.
              </p>
            </div>
          )}

          {/* Global Footer Preview */}
          <div className="mt-10 border-t pt-6 relative">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Footer (Global)</h2>
              <Button variant="outline" size="sm" onClick={() => setFooterEditorOpen(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Footer
              </Button>
            </div>
            <PublicFooter />
          </div>
        </div>
      </Card>
        </>
      )}

      {/* Dialogs */}
      <CarouselEditor open={carouselEditorOpen} onOpenChange={setCarouselEditorOpen} />
      <MenuEditor open={menuEditorOpen} onOpenChange={setMenuEditorOpen} />
      <NavBarEditor open={navBarEditorOpen} onOpenChange={setNavBarEditorOpen} />
      <FooterEditor open={footerEditorOpen} onOpenChange={setFooterEditorOpen} />
      <CategorySectionEditor
        open={categorySectionEditorOpen}
        onOpenChange={(open) => {
          setCategorySectionEditorOpen(open);
          if (!open) setEditingSection(null);
        }}
        onSave={handleSaveSection}
        initialData={editingSection?.data.type === "category" ? editingSection.data : undefined}
      />
      <TextSectionEditor
        open={textSectionEditorOpen}
        onOpenChange={(open) => {
          setTextSectionEditorOpen(open);
          if (!open) setEditingSection(null);
        }}
        onSave={handleSaveSection}
        initialData={editingSection?.data.type === "text" ? editingSection.data : undefined}
      />
    </div>
  );
};

export default HomePageBuilder;
