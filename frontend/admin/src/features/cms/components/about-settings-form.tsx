"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useFieldArray } from "react-hook-form";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { FileUpload } from "@/components/ui/file-upload";
import { useSiteSettingsAdmin, useUpsertSiteSetting } from "../hooks/use-cms";
import { toast } from "sonner";
import { getApiError } from "@/lib/api/errors";
import type { SiteSetting } from "../types";

const heroSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subtitle: z.string().optional(),
});

type HeroValues = z.infer<typeof heroSchema>;

const visionMissionSchema = z.object({
  visionTitle: z.string().min(1, "Vision title is required"),
  visionText: z.string().min(1, "Vision text is required"),
  visionIcon: z.string().optional(),
  missionTitle: z.string().min(1, "Mission title is required"),
  missionText: z.string().min(1, "Mission text is required"),
  missionIcon: z.string().optional(),
});

type VisionMissionValues = z.infer<typeof visionMissionSchema>;

const employeeSchema = z.object({
  designation: z.string().min(1, "Designation is required"),
  name: z.string().min(1, "Name is required"),
});

const importantDirectorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  designation: z.string().min(1, "Designation is required"),
  bio: z.string().min(1, "About is required"),
  photoUrl: z.string().min(1, "Photo is required"),
});

const leadershipSchema = z.object({
  employees: z.array(employeeSchema).default([]),
  importantDirectors: z.array(importantDirectorSchema).default([]),
});

type LeadershipValues = z.infer<typeof leadershipSchema>;

function getSettingValue(settings: SiteSetting[], key: string): Record<string, unknown> {
  const found = settings.find((s) => s.key === key);
  return (found?.value as Record<string, unknown>) ?? {};
}

/**
 * Narrowing predicate for values arriving from the settings API, whose shape is
 * not guaranteed. Any non-null object can be read with a string key, so this is
 * justified by the runtime check rather than asserted.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Reads a string field from untyped API data, defaulting to "" when absent. */
function readString(source: unknown, key: string): string {
  if (!isRecord(source)) return "";
  const value = source[key];
  return typeof value === "string" ? value : "";
}

export function AboutSettingsForm() {
  const { data: settings = [], isLoading } = useSiteSettingsAdmin();
  const upsert = useUpsertSiteSetting();
  const [initialized, setInitialized] = useState(false);

  const heroForm = useForm<HeroValues>({
    resolver: zodResolver(heroSchema),
    defaultValues: { title: "", subtitle: "" },
  });

  const vmForm = useForm<VisionMissionValues>({
    resolver: zodResolver(visionMissionSchema),
    defaultValues: {
      visionTitle: "",
      visionText: "",
      visionIcon: "",
      missionTitle: "",
      missionText: "",
      missionIcon: "",
    },
  });

  const leadershipForm = useForm<LeadershipValues>({
    resolver: zodResolver(leadershipSchema),
    defaultValues: { employees: [], importantDirectors: [] },
  });

  const employeesFieldArray = useFieldArray({
    control: leadershipForm.control,
    name: "employees",
  });
  const importantDirectorsFieldArray = useFieldArray({
    control: leadershipForm.control,
    name: "importantDirectors",
  });

  useEffect(() => {
    if (settings.length > 0 && !initialized) {
      const hero = getSettingValue(settings, "aboutHero");
      heroForm.reset({
        title: (hero.title as string) || "",
        subtitle: (hero.subtitle as string) || "",
      });

      const vm = getSettingValue(settings, "aboutVisionMission");
      vmForm.reset({
        visionTitle: (vm.visionTitle as string) || "",
        visionText: (vm.visionText as string) || "",
        visionIcon: (vm.visionIcon as string) || "",
        missionTitle: (vm.missionTitle as string) || "",
        missionText: (vm.missionText as string) || "",
        missionIcon: (vm.missionIcon as string) || "",
      });

      const leadership = getSettingValue(settings, "aboutLeadership");
      const employeesRaw = Array.isArray(leadership.employees)
        ? leadership.employees
        : [];
      const importantDirectorsRaw = Array.isArray(leadership.importantDirectors)
        ? leadership.importantDirectors
        : [];
      leadershipForm.reset({
        employees: employeesRaw
          .map((e) => ({
            designation: readString(e, "designation"),
            name: readString(e, "name"),
          }))
          .filter((e) => e.designation || e.name),
        importantDirectors: importantDirectorsRaw
          .map((d) => ({
            name: readString(d, "name"),
            designation: readString(d, "designation"),
            bio: readString(d, "bio"),
            photoUrl: readString(d, "photoUrl"),
          }))
          .filter((d) => d.name || d.designation || d.bio || d.photoUrl),
      });

      setInitialized(true);
    }
  }, [settings, initialized, heroForm, vmForm, leadershipForm]);

  const handleSaveHero = async (values: HeroValues) => {
    try {
      await upsert.mutateAsync({
        key: "aboutHero",
        value: { title: values.title.trim(), subtitle: values.subtitle?.trim() || "" },
      });
      toast.success("Hero section saved");
    } catch (err) {
      toast.error(getApiError(err, "Failed to save hero section").message);
    }
  };

  const handleSaveVisionMission = async (values: VisionMissionValues) => {
    try {
      await upsert.mutateAsync({
        key: "aboutVisionMission",
        value: {
          visionTitle: values.visionTitle.trim(),
          visionText: values.visionText.trim(),
          visionIcon: values.visionIcon?.trim() || "",
          missionTitle: values.missionTitle.trim(),
          missionText: values.missionText.trim(),
          missionIcon: values.missionIcon?.trim() || "",
        },
      });
      toast.success("Vision & Mission saved");
    } catch (err) {
      toast.error(getApiError(err, "Failed to save vision & mission").message);
    }
  };

  const handleSaveLeadership = async (values: LeadershipValues) => {
    try {
      await upsert.mutateAsync({
        key: "aboutLeadership",
        value: {
          employees: values.employees.map((e) => ({
            designation: e.designation.trim(),
            name: e.name.trim(),
          })),
          importantDirectors: values.importantDirectors.map((d) => ({
            name: d.name.trim(),
            designation: d.designation.trim(),
            bio: d.bio.trim(),
            photoUrl: d.photoUrl.trim(),
          })),
        },
      });
      toast.success("Leadership saved");
    } catch (err) {
      toast.error(getApiError(err, "Failed to save leadership").message);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3 max-w-xl">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <Tabs defaultValue="hero" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="hero">Hero</TabsTrigger>
          <TabsTrigger value="vision-mission">Vision & Mission</TabsTrigger>
          <TabsTrigger value="leadership">Leadership</TabsTrigger>
        </TabsList>

        <TabsContent value="hero" className="mt-4">
          <Form {...heroForm}>
            <form onSubmit={heroForm.handleSubmit(handleSaveHero)} className="space-y-3">
              <FormField
                control={heroForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="About Us page title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={heroForm.control}
                name="subtitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subtitle</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} placeholder="A brief subtitle for the hero section" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={upsert.isPending}>
                {upsert.isPending ? "Saving..." : "Save Hero"}
              </Button>
            </form>
          </Form>
        </TabsContent>

        <TabsContent value="vision-mission" className="mt-4">
          <Form {...vmForm}>
            <form onSubmit={vmForm.handleSubmit(handleSaveVisionMission)} className="space-y-4">
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Vision</p>
                <FormField
                  control={vmForm.control}
                  name="visionTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Our Vision" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={vmForm.control}
                  name="visionText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Text</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} placeholder="Describe the vision" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={vmForm.control}
                  name="visionIcon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Icon Name (optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. Eye, Target" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="border-t pt-4 space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Mission</p>
                <FormField
                  control={vmForm.control}
                  name="missionTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Our Mission" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={vmForm.control}
                  name="missionText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Text</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} placeholder="Describe the mission" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={vmForm.control}
                  name="missionIcon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Icon Name (optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. Rocket, Heart" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" disabled={upsert.isPending}>
                {upsert.isPending ? "Saving..." : "Save Vision & Mission"}
              </Button>
            </form>
          </Form>
        </TabsContent>

        <TabsContent value="leadership" className="mt-4">
          <Form {...leadershipForm}>
            <form
              onSubmit={leadershipForm.handleSubmit(handleSaveLeadership)}
              className="space-y-6"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">Other Employees</p>
                    <p className="text-xs text-muted-foreground">
                      Add roles like CTO, CFO, Academic Director.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      employeesFieldArray.append({ designation: "", name: "" })
                    }
                  >
                    <Plus className="mr-2 size-4" />
                    Add Employee
                  </Button>
                </div>

                <div className="space-y-3">
                  {employeesFieldArray.fields.map((field, idx) => (
                    <div
                      key={field.id}
                      className="rounded-lg border bg-card p-3 space-y-3"
                    >
                      <div className="grid gap-3 md:grid-cols-2">
                        <FormField
                          control={leadershipForm.control}
                          name={`employees.${idx}.designation`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Designation</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="CTO" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={leadershipForm.control}
                          name={`employees.${idx}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Aditya" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={idx === 0}
                          onClick={() => employeesFieldArray.move(idx, idx - 1)}
                        >
                          <ArrowUp className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={idx === employeesFieldArray.fields.length - 1}
                          onClick={() => employeesFieldArray.move(idx, idx + 1)}
                        >
                          <ArrowDown className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => employeesFieldArray.remove(idx)}
                        >
                          <Trash2 className="mr-2 size-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                  {employeesFieldArray.fields.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No employees added yet.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">Important Directors</p>
                    <p className="text-xs text-muted-foreground">
                      Name, Designation, one paragraph, and photo.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      importantDirectorsFieldArray.append({
                        name: "",
                        designation: "",
                        bio: "",
                        photoUrl: "",
                      })
                    }
                  >
                    <Plus className="mr-2 size-4" />
                    Add Director
                  </Button>
                </div>

                <div className="space-y-3">
                  {importantDirectorsFieldArray.fields.map((field, idx) => {
                    const photoUrl = leadershipForm.watch(
                      `importantDirectors.${idx}.photoUrl`,
                    );
                    return (
                      <div
                        key={field.id}
                        className="rounded-lg border bg-card p-3 space-y-3"
                      >
                        <div className="grid gap-3 md:grid-cols-2">
                          <FormField
                            control={leadershipForm.control}
                            name={`importantDirectors.${idx}.name`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Name</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Rehman" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={leadershipForm.control}
                            name={`importantDirectors.${idx}.designation`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Designation</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="Academic Director"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={leadershipForm.control}
                          name={`importantDirectors.${idx}.bio`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>About (one paragraph)</FormLabel>
                              <FormControl>
                                <Textarea {...field} rows={4} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={leadershipForm.control}
                          name={`importantDirectors.${idx}.photoUrl`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Photo</FormLabel>
                              <FormControl>
                                <div className="flex flex-col gap-3">
                                  <Input
                                    {...field}
                                    placeholder="Photo URL (or upload below)"
                                  />
                                  <FileUpload
                                    folder="about-us"
                                    label="Upload director photo"
                                    onUploadComplete={(_, url) =>
                                      leadershipForm.setValue(
                                        `importantDirectors.${idx}.photoUrl`,
                                        url,
                                        { shouldValidate: true },
                                      )
                                    }
                                  />
                                  {photoUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={photoUrl}
                                      alt="Director photo preview"
                                      className="h-24 w-24 rounded-lg object-cover border"
                                    />
                                  ) : null}
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={idx === 0}
                            onClick={() =>
                              importantDirectorsFieldArray.move(idx, idx - 1)
                            }
                          >
                            <ArrowUp className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={
                              idx === importantDirectorsFieldArray.fields.length - 1
                            }
                            onClick={() =>
                              importantDirectorsFieldArray.move(idx, idx + 1)
                            }
                          >
                            <ArrowDown className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() =>
                              importantDirectorsFieldArray.remove(idx)
                            }
                          >
                            <Trash2 className="mr-2 size-4" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {importantDirectorsFieldArray.fields.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No directors added yet.
                    </p>
                  )}
                </div>
              </div>

              <Button type="submit" disabled={upsert.isPending}>
                {upsert.isPending ? "Saving..." : "Save Leadership"}
              </Button>
            </form>
          </Form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
