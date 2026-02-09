import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  User, Phone, Mail, Building, Calendar, CreditCard,
  Users, HeartPulse, Loader2, MapPin, Award, Briefcase,
  Clock, DollarSign, Shield, FileText, Heart
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/hooks/queries";
import { useEffect, ReactNode } from "react";
import type { Employee } from "@/types";

interface InfoFieldProps {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}

interface InfoRowProps {
  icon: ReactNode;
  label: string;
  value: string;
}

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  sublabel?: string;
}

export default function ProfileDisplay() {
  const navigate = useNavigate();
  const { data: employee, isLoading: loading, error } = useProfile();

  // Handle authentication errors
  useEffect(() => {
    if (error) {
      // Check for 403 or unauthorized errors
      if (error.message?.includes("403") || error.message?.includes("Unauthorized")) {
        navigate("/auth/login", { replace: true });
      }
    }
  }, [error, navigate]);

  // Helper functions to handle the Employee type properties
  const getInitials = (): string => {
    if (!employee) return "";
    const first = employee.firstName?.charAt(0) || employee.name?.charAt(0) || "";
    const last = employee.lastName?.charAt(0) || "";
    return `${first}${last}`.toUpperCase();
  };

  const getFullName = (): string => {
    if (!employee) return "";
    if (employee.firstName && employee.lastName) {
      return `${employee.firstName} ${employee.lastName}`;
    }
    return employee.name || "";
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  const handleDocuments = () => {
    console.log("Documents button clicked, navigating to /profile/documents");
    navigate("/profile/documents");
  };

  // Helper getters for Employee type properties
  const isActive = employee?.isActive === true;
  const joiningDate = employee?.joiningDate;
  const position = employee?.position || employee?.designation || "N/A";
  const department = employee?.department || "N/A";
  const phone = employee?.phone || "N/A";

  const getAddress = (): string => {
    if (!employee?.address) return "N/A";
    if (typeof employee.address === 'string') return employee.address;
    const addr = employee.address;
    const parts = [addr.street, addr.city, addr.state, addr.pincode].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "N/A";
  };

  const emergencyContactName = employee?.emergencyContactName || "Not provided";
  const emergencyContactPhone = employee?.emergencyContactNumber || "Not provided";
  const aadhaarNumber = employee?.aadhaarNumber || "N/A";
  const panNumber = employee?.panNumber || "N/A";
  const bankName = employee?.bankName || "Not provided";
  const bankAccountNumber = employee?.bankAccountNumber || "Not provided";
  const bankIFSCCode = employee?.bankIFSCCode || "Not provided";
  const officeAddress = employee?.officeAddress || "N/A";
  const reportingManager = employee?.reportingSupervisor || "N/A";

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-neutral-950">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-lg text-gray-700 dark:text-gray-300">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-neutral-950">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 max-w-md">
          <p className="text-red-700 dark:text-red-400">
            {error.message || "Failed to load employee profile. Please try again later."}
          </p>
        </div>
      </div>
    );
  }

  if (!employee) return null;

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 to-slate-100 dark:from-neutral-900 dark:to-neutral-950 p-4 sm:p-8">
      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Top Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-white/70 dark:bg-neutral-900/60 shadow-sm border border-slate-100 dark:border-neutral-800">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 pointer-events-none" />
          <div className="p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
              <div className="relative">
                <Avatar className="w-24 h-24 sm:w-28 sm:h-28 border-4 border-white dark:border-neutral-700 shadow-lg">
                  <AvatarImage src={employee.profilePicture || ""} alt={getFullName()} />
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">{getInitials()}</AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-1.5 -right-1.5 inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-500 ring-2 ring-white dark:ring-neutral-700">
                  <Shield size={14} className="text-white" />
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="min-w-0">
                    <h1 className="truncate text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-neutral-50">
                      {getFullName()}
                    </h1>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-neutral-300">
                      <span className="inline-flex items-center gap-1">
                        <Briefcase size={16} />
                        {position}
                      </span>
                      <span className="hidden sm:inline h-4 w-px bg-slate-300 dark:bg-neutral-600" />
                      <span className="inline-flex items-center gap-1">
                        <Building size={16} />
                        {department}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3">
                    <Button
                      className="gap-2"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDocuments();
                      }}
                    >
                      <FileText size={16} /> Documents
                    </Button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-neutral-300">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-neutral-800">
                    <Mail size={14} /> {employee.email}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-neutral-800">
                    <Phone size={14} /> {phone}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-neutral-800">
                    <CreditCard size={14} /> ID: {employee.employeeId}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                    <Clock size={14} /> {isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <StatCard icon={<Calendar className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />} label="Joined" value={formatDate(joiningDate)} sublabel="Company" />
          <StatCard icon={<Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />} label="Department" value={department} sublabel="Team" />
          <StatCard icon={<HeartPulse className="h-5 w-5 text-red-600 dark:text-red-400" />} label="Leave Balance" value="12 days" sublabel="Annual" />
          <StatCard icon={<Award className="h-5 w-5 text-amber-600 dark:text-amber-400" />} label="Performance" value="Excellent" sublabel="Last Review" />
        </div>

        {/* Main Content */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Overview card */}
          <Card className="lg:col-span-1 shadow-sm bg-white dark:bg-neutral-900 border border-transparent dark:border-neutral-800">
            <CardHeader className="border-b border-slate-100 dark:border-neutral-800">
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-neutral-100">Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <InfoRow icon={<User size={16} />} label="Name" value={getFullName()} />
                <InfoRow icon={<Briefcase size={16} />} label="Position" value={position} />
                <InfoRow icon={<Building size={16} />} label="Department" value={department} />
                <InfoRow icon={<Calendar size={16} />} label="Joined" value={formatDate(joiningDate)} />
              </div>
              <Separator className="dark:bg-slate-700" />
              <div className="grid grid-cols-1 gap-3">
                <InfoRow icon={<Mail size={16} />} label="Email" value={employee.email} />
                <InfoRow icon={<Phone size={16} />} label="Phone" value={phone} />
                <InfoRow icon={<MapPin size={16} />} label="Address" value={getAddress()} />
              </div>
            </CardContent>
          </Card>

          {/* Right: Tabs */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="grid grid-cols-3 w-full mb-6 p-1 bg-white dark:bg-neutral-900 rounded-lg shadow-sm">
                <TabsTrigger value="personal" className="data-[state=active]:bg-primary/10 dark:data-[state=active]:bg-primary/20">
                  <User size={16} className="mr-2" />
                  Personal
                </TabsTrigger>
                <TabsTrigger value="employment" className="data-[state=active]:bg-primary/10 dark:data-[state=active]:bg-primary/20">
                  <Briefcase size={16} className="mr-2" />
                  Employment
                </TabsTrigger>
                <TabsTrigger value="financial" className="data-[state=active]:bg-primary/10 dark:data-[state=active]:bg-primary/20">
                  <DollarSign size={16} className="mr-2" />
                  Financial
                </TabsTrigger>
              </TabsList>

              {/* Personal */}
              <TabsContent value="personal">
                <Card className="shadow-sm bg-white dark:bg-neutral-900 border border-transparent dark:border-neutral-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-neutral-100">
                      <User size={20} /> Personal Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      <InfoField icon={<User size={16} />} label="First Name" value={employee.firstName || "N/A"} />
                      <InfoField icon={<User size={16} />} label="Last Name" value={employee.lastName || "N/A"} />
                      <InfoField icon={<Users size={16} />} label="Gender" value={employee.gender || "N/A"} />
                      <InfoField icon={<Calendar size={16} />} label="Date of Birth" value={formatDate(employee.dateOfBirth)} />
                      <InfoField icon={<Heart size={16} />} label="Marital Status" value={employee.maritalStatus || "N/A"} />
                      <InfoField icon={<User size={16} />} label="Father's Name" value={employee.fatherName || "N/A"} />
                      <InfoField icon={<User size={16} />} label="Mother's Name" value={employee.motherName || "N/A"} />
                    </div>

                    <Separator className="dark:bg-slate-700" />

                    <div>
                      <h3 className="text-lg font-medium flex items-center gap-2 mb-3 text-slate-900 dark:text-neutral-100">
                        <MapPin size={18} /> Address
                      </h3>
                      <div className="bg-slate-50 dark:bg-neutral-800 p-4 rounded-lg">
                        <p className="text-slate-700 dark:text-neutral-200">{getAddress()}</p>
                      </div>
                    </div>

                    <Separator className="dark:bg-slate-700" />

                    <div>
                      <h3 className="text-lg font-medium flex items-center gap-2 mb-3 text-slate-900 dark:text-slate-100">
                        <Phone size={18} className="text-red-500 dark:text-red-400" /> Emergency Contact
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-red-50 dark:bg-red-950/20 p-4 rounded-lg">
                        <InfoField icon={<User size={16} />} label="Name" value={emergencyContactName} />
                        <InfoField icon={<Phone size={16} />} label="Phone" value={emergencyContactPhone} />
                      </div>
                    </div>

                    <Separator className="dark:bg-slate-700" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      <InfoField icon={<CreditCard size={16} />} label="Aadhaar Number" value={aadhaarNumber} />
                      <InfoField icon={<CreditCard size={16} />} label="PAN Number" value={panNumber} />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Employment */}
              <TabsContent value="employment">
                <Card className="shadow-sm bg-white dark:bg-neutral-900 border border-transparent dark:border-neutral-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-neutral-100">
                      <Building size={20} /> Employment Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      <InfoField icon={<Building size={16} />} label="Department" value={department} />
                      <InfoField icon={<Briefcase size={16} />} label="Position" value={position} />
                      <InfoField icon={<Clock size={16} />} label="Employment Type" value={employee.employmentType || "N/A"} />
                      <InfoField icon={<Calendar size={16} />} label="Joining Date" value={formatDate(joiningDate)} />
                      <InfoField icon={<User size={16} />} label="Reporting Manager" value={reportingManager} />
                      <InfoField icon={<Shield size={16} />} label="Status" value={
                        <span className="inline-flex items-center gap-2">
                          <span className={`inline-block w-3 h-3 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      } />
                    </div>

                    <Separator className="dark:bg-slate-700" />

                    <div>
                      <h3 className="text-lg font-medium flex items-center gap-2 mb-3 text-slate-900 dark:text-neutral-100">
                        <Building size={18} /> Office Address
                      </h3>
                      <div className="bg-slate-50 dark:bg-neutral-800 p-4 rounded-lg">
                        <p className="text-slate-700 dark:text-neutral-200">{officeAddress}</p>
                      </div>
                    </div>

                    <Separator className="dark:bg-slate-700" />

                    <div className="bg-cyan-50 dark:bg-cyan-950/20 p-4 rounded-lg border-l-4 border-cyan-500 dark:border-cyan-700">
                      <h3 className="text-lg font-medium text-cyan-700 dark:text-cyan-300 mb-2">Employment Milestones</h3>
                      <ul className="space-y-2">
                        <li className="flex items-center gap-2 text-cyan-700 dark:text-cyan-300">
                          <Award size={16} />
                          <span className="text-sm">Joined the company on {formatDate(joiningDate)}</span>
                        </li>
                        {joiningDate && (
                          <li className="flex items-center gap-2 text-cyan-700 dark:text-cyan-300">
                            <Award size={16} />
                            <span className="text-sm">Completed 1 year on {formatDate(new Date(new Date(joiningDate).setFullYear(new Date(joiningDate).getFullYear() + 1)).toISOString())}</span>
                          </li>
                        )}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Financial */}
              <TabsContent value="financial">
                <Card className="shadow-sm bg-white dark:bg-neutral-900 border border-transparent dark:border-neutral-800">
                  <CardHeader className="border-b border-slate-100 dark:border-neutral-800">
                    <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-neutral-100">
                      <CreditCard size={20} /> Financial Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      <InfoField icon={<DollarSign size={16} />} label="Payment Mode" value="Bank Transfer" />
                      <InfoField icon={<CreditCard size={16} />} label="Bank Account" value={bankAccountNumber} />
                      <InfoField icon={<Building size={16} />} label="Bank Name" value={bankName} />
                      <InfoField icon={<CreditCard size={16} />} label="IFSC Code" value={bankIFSCCode} />
                    </div>

                    {!employee.bankName && !employee.bankAccountNumber && (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-lg w-full max-w-md">
                          <CreditCard className="h-10 w-10 text-yellow-500 dark:text-yellow-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-yellow-700 dark:text-yellow-300 mb-2">Financial Information Not Available</h3>
                          <p className="text-yellow-700 dark:text-yellow-300">Your financial details have not been added to the system yet. Please contact HR for more information.</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoField({ icon, label, value }: InfoFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm flex items-center gap-1.5 font-medium text-neutral-500 dark:text-neutral-400">
        {icon}
        {label}
      </label>
      <div className="bg-slate-50 dark:bg-neutral-800 p-2.5 rounded-md text-slate-800 dark:text-neutral-100">
        {typeof value === 'string' ? value : value}
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-slate-500 dark:text-neutral-400">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-neutral-400">{label}</p>
        <p className="text-sm text-slate-900 dark:text-neutral-100 truncate">{value}</p>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sublabel }: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-xl bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800 p-4 shadow-sm">
      <div className="absolute -right-6 -top-6 h-16 w-16 rounded-full bg-primary/5 group-hover:bg-primary/10 transition-colors" />
      <div className="flex items-center gap-3">
        <div className="grid place-items-center h-10 w-10 rounded-lg bg-primary/10 dark:bg-primary/15">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-slate-500 dark:text-neutral-400">{label}</p>
          <p className="text-base font-semibold text-slate-900 dark:text-neutral-100 truncate">{value}</p>
          {sublabel && <p className="text-[11px] text-slate-500 dark:text-neutral-400">{sublabel}</p>}
        </div>
      </div>
    </div>
  );
}
