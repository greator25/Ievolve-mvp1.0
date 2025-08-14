import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, X, CheckCircle, AlertTriangle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { UploadResult } from "@/lib/types";

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uploadType?: UploadType;
  onUploadTypeChange?: (type: UploadType | "") => void;
}

type UploadType = "hotel_inventory" | "coaches_officials" | "players";

export default function UploadModal({ 
  open, 
  onOpenChange, 
  uploadType: propsUploadType,
  onUploadTypeChange 
}: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<UploadType | "">(propsUploadType || "");
  
  // Sync with props when they change
  useEffect(() => {
    if (propsUploadType) {
      setUploadType(propsUploadType);
    }
  }, [propsUploadType]);
  const [options, setOptions] = useState({
    validateHotelIds: true,
    enforceMinimumStay: true,
    skipDuplicates: false,
  });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      try {
        const endpoint = `/api/admin/upload/${uploadType.replace('_', '-')}`;
        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        clearInterval(progressInterval);
        setUploadProgress(100);

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Upload failed');
        }

        return await response.json();
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      }
    },
    onSuccess: (result: UploadResult) => {
      setUploadResult(result);
      if (result.success) {
        toast({
          title: "Upload successful",
          description: `Created ${result.created} records`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      } else {
        toast({
          title: "Upload failed",
          description: `${result.errors.length} errors occurred`,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      setUploadProgress(0);
      toast({
        title: "Upload failed",
        description: error.message || "An error occurred during upload",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleUpload = () => {
    if (!file || !uploadType) {
      toast({
        title: "Missing information",
        description: "Please select a file and upload type",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('options', JSON.stringify(options));

    setUploadProgress(0);
    setUploadResult(null);
    uploadMutation.mutate(formData);
  };

  const handleClose = () => {
    setFile(null);
    setUploadType(propsUploadType || "");
    setUploadProgress(0);
    setUploadResult(null);
    onUploadTypeChange?.("");
    setOptions({
      validateHotelIds: true,
      enforceMinimumStay: true,
      skipDuplicates: false,
    });
    onOpenChange(false);
  };

  const getUploadTypeLabel = (type: string) => {
    switch (type) {
      case "hotel_inventory": return "Hotel Inventory Sheet";
      case "coaches_officials": return "Coach & Official Data Sheet";
      case "players": return "Player Data Sheet";
      default: return "Select sheet type...";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-full" data-testid="upload-modal">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Upload Data Sheet</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              data-testid="button-close-upload"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Upload Area */}
          <div className="border-2 border-gray-300 border-dashed rounded-lg p-6 text-center hover:border-primary-400 transition-colors">
            <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
              <Upload className="h-12 w-12" />
            </div>
            <div className="text-sm">
              <Label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500">
                <span>Click to upload</span>
                <Input
                  id="file-upload"
                  type="file"
                  className="sr-only"
                  accept=".psv,.csv"
                  onChange={handleFileSelect}
                  data-testid="input-file-upload"
                />
              </Label>
              <span className="text-gray-500"> or drag and drop</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">PSV files up to 10MB</p>
            {file && (
              <p className="text-sm text-primary-600 mt-2" data-testid="text-selected-file">
                Selected: {file.name}
              </p>
            )}
          </div>

          {/* Upload Type Selection */}
          {/* Only show type selection if not pre-selected */}
          {!propsUploadType && (
            <div className="space-y-2">
              <Label>Data Sheet Type</Label>
              <Select value={uploadType} onValueChange={(value: UploadType) => setUploadType(value)}>
                <SelectTrigger data-testid="select-upload-type">
                  <SelectValue placeholder="Select sheet type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hotel_inventory">Hotel Inventory Sheet</SelectItem>
                  <SelectItem value="coaches_officials">Coach & Official Data Sheet</SelectItem>
                  <SelectItem value="players">Player Data Sheet</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Show selected type when pre-selected */}
          {propsUploadType && (
            <div className="space-y-2">
              <Label>Data Sheet Type</Label>
              <div className="p-3 bg-gray-50 border rounded-md">
                <span className="text-sm font-medium">
                  {propsUploadType === "hotel_inventory" && "Hotel Inventory Sheet"}
                  {propsUploadType === "coaches_officials" && "Coach & Official Data Sheet"}
                  {propsUploadType === "players" && "Player Data Sheet"}
                </span>
              </div>
            </div>
          )}

          {/* Validation Options */}
          <div className="space-y-3">
            <Label>Validation Options</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="validate-hotel-ids"
                  checked={options.validateHotelIds}
                  onCheckedChange={(checked) =>
                    setOptions({ ...options, validateHotelIds: checked as boolean })
                  }
                  data-testid="checkbox-validate-hotel-ids"
                />
                <Label htmlFor="validate-hotel-ids" className="text-sm">
                  Validate hotel ID references
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enforce-minimum-stay"
                  checked={options.enforceMinimumStay}
                  onCheckedChange={(checked) =>
                    setOptions({ ...options, enforceMinimumStay: checked as boolean })
                  }
                  data-testid="checkbox-enforce-minimum-stay"
                />
                <Label htmlFor="enforce-minimum-stay" className="text-sm">
                  Enforce minimum 3-day stay
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="skip-duplicates"
                  checked={options.skipDuplicates}
                  onCheckedChange={(checked) =>
                    setOptions({ ...options, skipDuplicates: checked as boolean })
                  }
                  data-testid="checkbox-skip-duplicates"
                />
                <Label htmlFor="skip-duplicates" className="text-sm">
                  Skip duplicate detection
                </Label>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {uploadMutation.isPending && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" data-testid="upload-progress" />
            </div>
          )}

          {/* Upload Result */}
          {uploadResult && (
            <div className="space-y-3">
              {uploadResult.success ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Upload successful! Created {uploadResult.created} records.
                    {uploadResult.warnings.length > 0 && ` ${uploadResult.warnings.length} warnings.`}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Upload failed with {uploadResult.errors.length} errors.
                  </AlertDescription>
                </Alert>
              )}

              {uploadResult.errors.length > 0 && (
                <div className="max-h-32 overflow-y-auto">
                  <h4 className="text-sm font-medium text-error-600 mb-2">Errors:</h4>
                  <ul className="text-xs text-error-600 space-y-1">
                    {uploadResult.errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {uploadResult.warnings.length > 0 && (
                <div className="max-h-32 overflow-y-auto">
                  <h4 className="text-sm font-medium text-warning-600 mb-2">Warnings:</h4>
                  <ul className="text-xs text-warning-600 space-y-1">
                    {uploadResult.warnings.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={uploadMutation.isPending}
              data-testid="button-cancel-upload"
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleUpload}
              disabled={!file || !uploadType || uploadMutation.isPending}
              data-testid="button-upload-file"
            >
              {uploadMutation.isPending ? "Uploading..." : "Upload & Validate"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
