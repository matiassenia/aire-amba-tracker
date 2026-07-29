import * as React from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  // Panel A: zona seleccionada
  zoneTitle?: string | null;
  zoneDetail: React.ReactNode;

  // Panel B: estado general
  generalTitle?: string;
  generalDetail: React.ReactNode; // <AQISummaryCard .../>

  // UX
  defaultGeneralOpen?: boolean;
};

export function AirQualityBottomSheet({
  open,
  onOpenChange,
  zoneTitle,
  zoneDetail,
  generalTitle = "Estado general",
  generalDetail,
  defaultGeneralOpen = false,
}: Props) {
  const [generalOpen, setGeneralOpen] = React.useState(defaultGeneralOpen);

  // Si se abre el sheet por click en zona, mantenemos "Estado general" colapsado por defecto
  React.useEffect(() => {
    if (open) setGeneralOpen(defaultGeneralOpen);
  }, [open, defaultGeneralOpen]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <div className="mx-auto w-full max-w-2xl px-4 pb-6">
          <DrawerHeader className="px-0">
            <DrawerTitle className="text-base font-semibold">
              {zoneTitle ? `Zona: ${zoneTitle}` : "Calidad del aire"}
            </DrawerTitle>
          </DrawerHeader>

          {/* Panel A: Detalle zona (prioridad 1) */}
          <div className="space-y-3">
            {zoneDetail}
          </div>

          {/* Separador */}
          <div className="my-4 h-px w-full bg-border/60" />

          {/* Panel B: Estado general (colapsable) */}
          <Collapsible open={generalOpen} onOpenChange={setGeneralOpen}>
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">{generalTitle}</div>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <span className="text-xs text-muted-foreground">
                    {generalOpen ? "Ocultar" : "Ver"}
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${generalOpen ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
            </div>

            <CollapsibleContent className="mt-3">
              {generalDetail}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
