// Media library: upload tiles for images added this session (the API has no
// list endpoint yet). Pick a file, attach optional alt text, upload, then copy
// the public URL for use in content fields. 413/415 rejections surface as
// plain-language messages.
import { useRef, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ApiError } from "../api";
import { absoluteMediaUrl, uploadMedia, type MediaUpload } from "../media";
import { theme } from "../theme";
import { Btn, LabeledInput, Toast, type ToastState } from "../ui";

type Tile = MediaUpload & { alt: string; absoluteUrl: string };

export function MediaScreen() {
  const [alt, setAlt] = useState("");
  const [busy, setBusy] = useState(false);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [toast, setToast] = useState<ToastState>(null);
  const fileRef = useRef<File | null>(null);
  // Re-render trigger: picked File objects live outside React state.
  const [, setPicked] = useState(0);

  function pick() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp";
    input.onchange = () => {
      fileRef.current = input.files?.[0] ?? null;
      setPicked((n) => n + 1);
    };
    input.click();
  }

  async function upload() {
    const file = fileRef.current;
    if (!file || busy) return;
    setBusy(true);
    try {
      const res = await uploadMedia(file, alt.trim());
      setTiles((prev) => [
        { ...res, alt: alt.trim(), absoluteUrl: absoluteMediaUrl(res.url) },
        ...prev,
      ]);
      fileRef.current = null;
      setAlt("");
      setPicked((n) => n + 1);
      setToast({ message: "Uploaded.", kind: "ok" });
    } catch (err) {
      setToast({ message: uploadErrorText(err), kind: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function copyUrl(tile: Tile) {
    try {
      await navigator.clipboard.writeText(tile.absoluteUrl);
      setToast({ message: "URL copied to clipboard.", kind: "ok" });
    } catch {
      setToast({ message: tile.absoluteUrl, kind: "error" });
    }
  }

  const pending = fileRef.current;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>Media</Text>
      </View>

      <View style={styles.uploadCard}>
        <LabeledInput
          label="Alt text (optional)"
          value={alt}
          onChangeText={setAlt}
          placeholder="Describe the image"
          hint="JPG, PNG or WebP · max 10 MB"
        />
        <View style={styles.uploadRow}>
          <Btn
            label={pending ? `Selected: ${pending.name}` : "Choose image…"}
            onPress={pick}
            disabled={busy}
          />
          <Btn label="Upload" variant="primary" onPress={() => void upload()} busy={busy} />
        </View>
      </View>

      {tiles.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Nothing uploaded yet.</Text>
          <Text style={styles.emptyBody}>
            Uploads made in this session appear below. The library listing arrives with a later API release.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.grid}>
          {tiles.map((tile) => (
            <View key={tile.id} style={styles.tile}>
              <Image source={{ uri: tile.absoluteUrl }} style={styles.preview} resizeMode="cover" />
              <Text style={styles.tileKey} numberOfLines={1}>
                {tile.key}
              </Text>
              <Text style={styles.tileMeta} numberOfLines={1}>
                {tile.mime} · {(tile.bytes / 1024).toFixed(0)} kB{tile.alt ? ` · ${tile.alt}` : ""}
              </Text>
              <Btn label="Copy URL" onPress={() => void copyUrl(tile)} />
            </View>
          ))}
        </ScrollView>
      )}

      <Toast toast={toast} onDone={() => setToast(null)} />
    </View>
  );
}

function uploadErrorText(err: unknown): string {
  if (!(err instanceof ApiError)) return "Network error. Check your connection.";
  switch (err.code) {
    case "network_error":
      return "Network error. Check your connection.";
    case "too_large":
      return "File is larger than the 10 MB limit.";
    case "unsupported_type":
      return "Unsupported image type — use JPG, PNG or WebP.";
    case "missing_file":
      return "No file was attached. Choose an image first.";
    default:
      return `Upload failed (${err.code}).`;
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  header: { marginBottom: 12 },
  title: { color: theme.text, fontSize: 22, fontWeight: "700" },
  uploadCard: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
    padding: 14,
    gap: 12,
  },
  uploadRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, paddingBottom: 24 },
  tile: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    width: 200,
    gap: 8,
  },
  preview: {
    backgroundColor: "#00000033",
    borderColor: theme.border,
    borderRadius: 6,
    borderWidth: 1,
    height: 120,
    width: "100%",
  },
  tileKey: { color: theme.text, fontSize: 12, fontWeight: "600" },
  tileMeta: { color: theme.textDim, fontSize: 11 },
  empty: { alignItems: "center", marginTop: 56, gap: 6, paddingHorizontal: 32 },
  emptyTitle: { color: theme.textDim, fontSize: 15, fontWeight: "600" },
  emptyBody: { color: theme.textDim, fontSize: 13, textAlign: "center" },
});
