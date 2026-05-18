"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQRSettings, useUpdateQRSettings } from "@/features/payments/hooks/use-payments";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { uploadFile } from "@/lib/api/upload";

export default function PaymentSettingsPage() {
    const { data, isLoading } = useQRSettings();
    const update = useUpdateQRSettings();

    const [form, setForm] = useState({
        qrImageUrl: "",
        upiId: "",
        bankName: "",
        bankAccountNumber: "",
        bankIfsc: "",
        bankAccountHolder: "",
        instructions: "",
    });
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (data) {
            setForm({
                qrImageUrl: data.qrImageUrl ?? "",
                upiId: data.upiId ?? "",
                bankName: data.bankName ?? "",
                bankAccountNumber: data.bankAccountNumber ?? "",
                bankIfsc: data.bankIfsc ?? "",
                bankAccountHolder: data.bankAccountHolder ?? "",
                instructions: data.instructions ?? "",
            });
        }
    }, [data]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            toast.error("Please upload an image file");
            return;
        }
        setUploading(true);
        try {
            const url = await uploadFile(file, "qr-codes");
            setForm((s) => ({ ...s, qrImageUrl: url }));
            toast.success("QR code uploaded");
        } catch (err: any) {
            toast.error(err?.message || "Upload failed");
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        try {
            await update.mutateAsync(form);
            toast.success("Payment settings saved");
        } catch (err: any) {
            toast.error(err?.message || "Save failed");
        }
    };

    return (
        <PageLayout
            header="Payment Settings"
            description="Configure the QR code, UPI ID, and bank details learners see at checkout. They pay manually and upload proof; you review and approve."
        >
            {isLoading ? (
                <Skeleton className="h-96" />
            ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">QR Code</CardTitle>
                            <CardDescription>
                                Upload the QR image learners will scan to pay (UPI/bank-app QR).
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {form.qrImageUrl ? (
                                <div className="relative mx-auto h-56 w-56 overflow-hidden rounded-md border bg-white">
                                    <Image
                                        src={form.qrImageUrl}
                                        alt="QR code"
                                        fill
                                        className="object-contain"
                                        sizes="224px"
                                        unoptimized
                                    />
                                </div>
                            ) : (
                                <div className="mx-auto grid h-56 w-56 place-items-center rounded-md border border-dashed text-sm text-muted-foreground">
                                    No QR uploaded
                                </div>
                            )}
                            <div className="flex items-center justify-center gap-2">
                                <Label htmlFor="qr-upload" className="cursor-pointer">
                                    <span className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm shadow-sm hover:bg-accent">
                                        <Upload className="h-4 w-4" />
                                        {uploading ? "Uploading…" : "Upload QR"}
                                    </span>
                                    <input
                                        id="qr-upload"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        disabled={uploading}
                                        onChange={handleUpload}
                                    />
                                </Label>
                                {form.qrImageUrl && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setForm((s) => ({ ...s, qrImageUrl: "" }))}
                                    >
                                        Remove
                                    </Button>
                                )}
                            </div>
                            <div>
                                <Label className="text-xs">UPI ID</Label>
                                <Input
                                    value={form.upiId}
                                    onChange={(e) => setForm((s) => ({ ...s, upiId: e.target.value }))}
                                    placeholder="yourname@bank"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Bank details</CardTitle>
                            <CardDescription>
                                Fallback transfer option shown alongside the QR code.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div>
                                <Label className="text-xs">Account holder name</Label>
                                <Input
                                    value={form.bankAccountHolder}
                                    onChange={(e) => setForm((s) => ({ ...s, bankAccountHolder: e.target.value }))}
                                />
                            </div>
                            <div>
                                <Label className="text-xs">Bank name</Label>
                                <Input
                                    value={form.bankName}
                                    onChange={(e) => setForm((s) => ({ ...s, bankName: e.target.value }))}
                                />
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <Label className="text-xs">Account number</Label>
                                    <Input
                                        value={form.bankAccountNumber}
                                        onChange={(e) => setForm((s) => ({ ...s, bankAccountNumber: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">IFSC</Label>
                                    <Input
                                        value={form.bankIfsc}
                                        onChange={(e) => setForm((s) => ({ ...s, bankIfsc: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <div>
                                <Label className="text-xs">Instructions to learner</Label>
                                <Textarea
                                    rows={4}
                                    value={form.instructions}
                                    onChange={(e) => setForm((s) => ({ ...s, instructions: e.target.value }))}
                                    placeholder="Pay the exact amount, then upload a screenshot of the transaction."
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end lg:col-span-2">
                        <Button onClick={handleSave} disabled={update.isPending}>
                            {update.isPending ? "Saving…" : "Save changes"}
                        </Button>
                    </div>
                </div>
            )}
        </PageLayout>
    );
}
