import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { LevelBenefit, InsertLevelBenefit } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export function BenefitsManager() {
  const { toast } = useToast();
  const [editingBenefit, setEditingBenefit] = useState<LevelBenefit | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: benefits } = useQuery({
    queryKey: ["/api/benefits"],
    queryFn: async () => {
      const response = await fetch("/api/benefits");
      if (!response.ok) throw new Error("Failed to fetch benefits");
      return response.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/benefits/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete benefit");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/benefits"] });
      toast({
        title: "Success",
        description: "Benefit deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; updates: Partial<InsertLevelBenefit> }) => {
      const response = await fetch(`/api/benefits/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data.updates),
      });
      if (!response.ok) throw new Error("Failed to update benefit");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/benefits"] });
      setIsEditDialogOpen(false);
      toast({
        title: "Success",
        description: "Benefit updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (benefit: LevelBenefit) => {
    setEditingBenefit(benefit);
    setIsEditDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Manage Benefits</h2>

      <div className="grid gap-4">
        {benefits?.map((benefit: LevelBenefit) => (
          <div
            key={benefit.id}
            className="flex items-center justify-between p-4 border rounded-lg bg-white shadow-sm"
          >
            <div>
              <p className="font-medium">{benefit.level}</p>
              <p className="text-sm text-gray-600">{benefit.benefit}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEdit(benefit)}
              >
                تعديل
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    حذف
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>حذف المميزات</AlertDialogTitle>
                    <AlertDialogDescription>
                      هل أنت متأكد من حذف هذه الميزة؟ لا يمكن التراجع عن هذا الإجراء.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteMutation.mutate(benefit.id)}
                    >
                      حذف
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل المميزات</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!editingBenefit) return;

              const formData = new FormData(e.currentTarget);
              updateMutation.mutate({
                id: editingBenefit.id,
                updates: {
                  level: formData.get("level") as string,
                  benefit: formData.get("benefit") as string,
                },
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="level">المستوى</Label>
              <Input
                id="level"
                name="level"
                defaultValue={editingBenefit?.level}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="benefit">وصف الميزة</Label>
              <Input
                id="benefit"
                name="benefit"
                defaultValue={editingBenefit?.benefit}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                حفظ التغييرات
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}