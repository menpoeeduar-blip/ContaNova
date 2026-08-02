import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, Wifi, WifiOff, RefreshCw, LogOut, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  getWhatsAppStatus,
  getWhatsAppQr,
  logoutWhatsApp,
  WA_URL,
} from "@/lib/whatsapp";

export function WhatsAppConnectPanel({ compact = false }: { compact?: boolean }) {
  const queryClient = useQueryClient();

  const { data: status, isError, isLoading } = useQuery({
    queryKey: ["wa-status"],
    queryFn: getWhatsAppStatus,
    refetchInterval: 3000,
    retry: 1,
  });

  const { data: qrData } = useQuery({
    queryKey: ["wa-qr"],
    queryFn: getWhatsAppQr,
    enabled: !!status && !status.connected,
    refetchInterval: status?.connected ? false : 4000,
    retry: false,
  });

  const logoutMut = useMutation({
    mutationFn: logoutWhatsApp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wa-status"] });
      queryClient.invalidateQueries({ queryKey: ["wa-qr"] });
      toast.success("Sesión de WhatsApp cerrada. Escanea el nuevo QR.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const connected = status?.connected;
  const statusLabel = connected
    ? "Conectado"
    : status?.status === "qr"
      ? "Escanea el QR"
      : status?.status === "connecting"
        ? "Conectando..."
        : isError
          ? "Servidor no disponible"
          : "Desconectado";

  return (
    <Card className={compact ? "border-emerald-800/40 bg-slate-900/60" : "border-slate-800 bg-slate-900/60"}>
      <CardHeader className={compact ? "pb-2" : undefined}>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <QrCode className="w-5 h-5 text-emerald-400" />
              WhatsApp (Baileys)
            </CardTitle>
            {!compact && (
              <CardDescription className="mt-1">
                Conecta tu WhatsApp escaneando el QR. Sin API oficial de Meta.
              </CardDescription>
            )}
          </div>
          <Badge
            className={
              connected
                ? "bg-emerald-600 text-white"
                : isError
                  ? "bg-rose-700 text-white"
                  : "bg-amber-600/80 text-white"
            }
          >
            {connected ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
            {statusLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" /> Consultando servidor...
          </div>
        )}

        {isError && (
          <div className="text-sm text-amber-300/90 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
            No se pudo contactar el servidor WhatsApp en{" "}
            <code className="text-xs">{WA_URL}</code>. Arranca el servicio local o configura{" "}
            <code className="text-xs">VITE_WHATSAPP_URL</code>.
          </div>
        )}

        {!isError && !connected && qrData?.qr && (
          <div className="flex flex-col items-center gap-2">
            <img
              src={qrData.qr}
              alt="QR WhatsApp"
              className="w-56 h-56 rounded-xl bg-white p-2 border border-slate-700"
            />
            <p className="text-xs text-slate-400 text-center max-w-xs">
              WhatsApp → Dispositivos vinculados → Vincular dispositivo
            </p>
          </div>
        )}

        {!isError && !connected && !qrData?.qr && !isLoading && (
          <p className="text-sm text-slate-400">
            Generando QR... Si tarda, reinicia el servidor WhatsApp.
          </p>
        )}

        {connected && (
          <p className="text-sm text-emerald-300/90">
            Listo para enviar mensajes masivos con intervalo anti-ban.
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            className="border-slate-700 text-slate-200"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["wa-status"] });
              queryClient.invalidateQueries({ queryKey: ["wa-qr"] });
            }}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Actualizar
          </Button>
          {connected && (
            <Button
              size="sm"
              variant="outline"
              className="border-rose-700/50 text-rose-300"
              disabled={logoutMut.isPending}
              onClick={() => logoutMut.mutate()}
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5" />
              Desconectar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
