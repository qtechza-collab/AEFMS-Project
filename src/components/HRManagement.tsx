import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';
import { toast } from 'sonner';
import { 
  Users, 
  UserPlus, 
  UserCheck, 
  UserX, 
  Search, 
  Filter, 
  Download, 
  FileText, 
  Eye, 
  Edit, 
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Star,
  TrendingUp,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Shield,
  MoreHorizontal
} from 'lucide-react';
import { api } from '../utils/api';

interface Employee {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  department: string;
  position: string;
  employee_id: string;
  phone?: string;
  status: 'active' | 'pending' | 'suspended';
  hire_date: string;
  salary?: number;
  performance_rating?: number;
  kpi_score?: number;
  profile_photo?: string;
  created_at: string;
  approved_by?: string;
  approved_at?: string;
}

interface PerformanceReview {
  id: string;
  employee_id: string;
  reviewer_id: string;
  review_period: string;
  overall_rating: number;
  goals_achievement: number;
  communication: number;
  teamwork: number;
  punctuality: number;
  comments: string;
  status: 'draft' | 'submitted' | 'approved';
  created_at: string;
}

export function HRManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<Employee[]>([]);
  const [performanceReviews, setPerformanceReviews] = useState<PerformanceReview[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [showEmployeeDetails, setShowEmployeeDetails] = useState(false);
  const [showPerformanceReview, setShowPerformanceReview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // New employee form data
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    username: '',
    email: '',
    role: 'employee',
    department: '',
    position: '',
    phone: '',
    salary: '',
    hire_date: new Date().toISOString().split('T')[0]
  });

  // Performance review form data
  const [reviewForm, setReviewForm] = useState({
    employee_id: '',
    review_period: '',
    overall_rating: 5,
    goals_achievement: 5,
    communication: 5,
    teamwork: 5,
    punctuality: 5,
    comments: ''
  });

  const departments = [
    'Logistics', 'Operations', 'Finance', 'Human Resources', 
    'Administration', 'Maintenance', 'Customer Service'
  ];

  const positions = [
    'Driver', 'Dispatcher', 'Warehouse Manager', 'Mechanic', 
    'Account Manager', 'HR Manager', 'Operations Manager', 
    'Finance Manager', 'Administrator', 'Customer Service Rep'
  ];

  useEffect(() => {
    fetchEmployees();
    fetchPendingApprovals();
    fetchPerformanceReviews();
  }, []);

  const fetchEmployees = async () => {
    try {
      setIsLoading(true);
      const response = await api.getUsers();
      if (response.success) {
        setEmployees(response.data.filter(user => user.status === 'active'));
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to fetch employees');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPendingApprovals = async () => {
    try {
      const response = await api.getPendingApprovals();
      if (response.success && Array.isArray(response.data)) {
        setPendingApprovals(response.data);
      } else {
        setPendingApprovals([]);
      }
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      setPendingApprovals([]);
    }
  };

  const fetchPerformanceReviews = async () => {
    try {
      const response = await api.getPerformanceReviews();
      if (response.success && Array.isArray(response.data)) {
        setPerformanceReviews(response.data);
      } else {
        setPerformanceReviews([]);
      }
    } catch (error) {
      console.error('Error fetching performance reviews:', error);
      setPerformanceReviews([]);
    }
  };

  const handleCreateEmployee = async () => {
    try {
      if (!newEmployee.name || !newEmployee.username || !newEmployee.email) {
        toast.error('Please fill in all required fields');
        return;
      }

      const employeeData = {
        ...newEmployee,
        salary: parseFloat(newEmployee.salary) || 25000,
        status: 'active',
        employee_id: `LF-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`,
        performance_rating: 0,
        kpi_score: 0
      };

      const response = await api.createUser(employeeData);
      if (response.success) {
        toast.success('Employee created successfully!');
        setShowAddEmployee(false);
        setNewEmployee({
          name: '',
          username: '',
          email: '',
          role: 'employee',
          department: '',
          position: '',
          phone: '',
          salary: '',
          hire_date: new Date().toISOString().split('T')[0]
        });
        fetchEmployees();
      }
    } catch (error) {
      console.error('Error creating employee:', error);
      toast.error('Failed to create employee');
    }
  };

  const handleApproveUser = async (userId: string) => {
    try {
      const response = await api.approveUser(userId, 'HR_APPROVED');
      if (response.success) {
        toast.success('User approved successfully!');
        fetchPendingApprovals();
        fetchEmployees();
      }
    } catch (error) {
      console.error('Error approving user:', error);
      toast.error('Failed to approve user');
    }
  };

  const handleRejectUser = async (userId: string, reason?: string) => {
    try {
      const response = await api.rejectUser(userId, 'HR_REJECTED', reason);
      if (response.success) {
        toast.success('User rejected successfully!');
        fetchPendingApprovals();
      }
    } catch (error) {
      console.error('Error rejecting user:', error);
      toast.error('Failed to reject user');
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    try {
      if (window.confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
        const response = await api.deleteUser(employeeId);
        if (response.success) {
          toast.success('Employee deleted successfully!');
          fetchEmployees();
          setShowEmployeeDetails(false);
        }
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error('Failed to delete employee');
    }
  };

  const handleUpdateEmployee = async (employeeId: string, updateData: any) => {
    try {
      const response = await api.updateUser(employeeId, updateData);
      if (response.success) {
        toast.success('Employee updated successfully!');
        fetchEmployees();
        setShowEmployeeDetails(false);
      }
    } catch (error) {
      console.error('Error updating employee:', error);
      toast.error('Failed to update employee');
    }
  };

  const handleExportEmployees = async (format: 'excel' | 'pdf' | 'csv' = 'excel') => {
    try {
      setIsExporting(true);
      
      const filteredEmployees = employees.filter(employee => {
        const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            employee.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            employee.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || employee.status === filterStatus;
        const matchesDepartment = filterDepartment === 'all' || employee.department === filterDepartment;
        
        return matchesSearch && matchesStatus && matchesDepartment;
      });

      if (format === 'csv') {
        // Generate CSV locally
        let csvContent = 'Employee ID,Name,Email,Department,Position,Status,Hire Date,Salary\n';
        filteredEmployees.forEach(emp => {
          csvContent += `${emp.employee_id},${emp.name},${emp.email},${emp.department},${emp.position},${emp.status},${emp.hire_date},${emp.salary || 'N/A'}\n`;
        });
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `employees_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        // Use API for Excel/PDF export
        const response = await api.exportToExcel(filteredEmployees, `employees_${new Date().toISOString().split('T')[0]}`);
        if (response.success) {
          // Download the file
          const blob = new Blob([response.data], { 
            type: format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf' 
          });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `employees_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }
      }
      
      toast.success(`Employee list exported as ${format.toUpperCase()} successfully!`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export employee list');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCreatePerformanceReview = async () => {
    try {
      if (!reviewForm.employee_id || !reviewForm.review_period) {
        toast.error('Please fill in all required fields');
        return;
      }

      const response = await api.createPerformanceReview(reviewForm);
      if (response.success) {
        toast.success('Performance review created successfully!');
        setShowPerformanceReview(false);
        setReviewForm({
          employee_id: '',
          review_period: '',
          overall_rating: 5,
          goals_achievement: 5,
          communication: 5,
          teamwork: 5,
          punctuality: 5,
          comments: ''
        });
        fetchPerformanceReviews();
      }
    } catch (error) {
      console.error('Error creating performance review:', error);
      toast.error('Failed to create performance review');
    }
  };

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        employee.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        employee.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || employee.status === filterStatus;
    const matchesDepartment = filterDepartment === 'all' || employee.department === filterDepartment;
    
    return matchesSearch && matchesStatus && matchesDepartment;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'administrator': return 'bg-red-100 text-red-800';
      case 'hr': return 'bg-purple-100 text-purple-800';
      case 'employer': return 'bg-blue-100 text-blue-800';
      case 'employee': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl text-slate-900">HR Management</h2>
          <p className="text-slate-600">Manage employees, approvals, and performance reviews</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => setShowAddEmployee(true)}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Employee
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExportEmployees('excel')}
            disabled={isExporting}
          >
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExportEmployees('pdf')}
            disabled={isExporting}
          >
            <FileText className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      <Tabs defaultValue="employees" className="space-y-6">
        <TabsList className="bg-white">
          <TabsTrigger value="employees">All Employees ({employees.length})</TabsTrigger>
          <TabsTrigger value="approvals">Pending Approvals ({pendingApprovals.length})</TabsTrigger>
          <TabsTrigger value="performance">Performance Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="space-y-6">
          {/* Search and Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                      placeholder="Search employees by name, ID, or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Employee List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-slate-900">Employee Directory</CardTitle>
              <CardDescription>
                {filteredEmployees.length} of {employees.length} employees shown
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredEmployees.map((employee) => (
                  <div key={employee.id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-slate-900">{employee.name}</h3>
                          <Badge variant="outline" className={getRoleBadgeColor(employee.role)}>
                            {employee.role}
                          </Badge>
                          <Badge variant="secondary" className={getStatusColor(employee.status)}>
                            {employee.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-500">
                          <div className="flex items-center">
                            <Shield className="w-4 h-4 mr-1" />
                            {employee.employee_id}
                          </div>
                          <div className="flex items-center">
                            <Mail className="w-4 h-4 mr-1" />
                            {employee.email}
                          </div>
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-1" />
                            {employee.department}
                          </div>
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {new Date(employee.hire_date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {employee.performance_rating && (
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4 text-yellow-400" />
                          <span className="text-sm text-slate-600">{employee.performance_rating}/5</span>
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedEmployee(employee);
                          setShowEmployeeDetails(true);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedEmployee(employee);
                          setShowEmployeeDetails(true);
                        }}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-slate-900">Pending User Approvals</CardTitle>
              <CardDescription>Review and approve new user registrations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingApprovals.length === 0 ? (
                  <div className="text-center py-8">
                    <UserCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-slate-600 mb-2">No pending approvals</h3>
                    <p className="text-sm text-slate-500">All user registrations have been processed</p>
                  </div>
                ) : (
                  pendingApprovals.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                          <Clock className="w-6 h-6 text-yellow-600" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="text-slate-900">{user.name}</h3>
                            <Badge variant="outline" className={getRoleBadgeColor(user.role)}>
                              {user.role}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-500">
                            <div>{user.email}</div>
                            <div>{user.department}</div>
                            <div>Applied: {new Date(user.created_at).toLocaleDateString()}</div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApproveUser(user.id)}
                          className="text-green-600 border-green-600 hover:bg-green-50"
                        >
                          <UserCheck className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRejectUser(user.id, 'Not suitable for the role')}
                          className="text-red-600 border-red-600 hover:bg-red-50"
                        >
                          <UserX className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-slate-900">Performance Reviews</CardTitle>
                  <CardDescription>Manage employee performance evaluations</CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowPerformanceReview(true)}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  New Review
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {performanceReviews.length === 0 ? (
                  <div className="text-center py-8">
                    <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-slate-600 mb-2">No performance reviews</h3>
                    <p className="text-sm text-slate-500">Create your first performance review</p>
                  </div>
                ) : (
                  performanceReviews.map((review) => (
                    <div key={review.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-slate-900">Performance Review</h3>
                          <Badge variant="secondary" className={getStatusColor(review.status)}>
                            {review.status}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4 text-yellow-400" />
                          <span className="text-sm text-slate-600">{review.overall_rating}/5</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-500">
                        <div>Period: {review.review_period}</div>
                        <div>Employee ID: {review.employee_id}</div>
                        <div>Created: {new Date(review.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Employee Dialog */}
      <Dialog open={showAddEmployee} onOpenChange={setShowAddEmployee}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
            <DialogDescription>Create a new employee record in the system</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={newEmployee.name}
                onChange={(e) => setNewEmployee(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                value={newEmployee.username}
                onChange={(e) => setNewEmployee(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Enter username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={newEmployee.email}
                onChange={(e) => setNewEmployee(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={newEmployee.phone}
                onChange={(e) => setNewEmployee(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Enter phone number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={newEmployee.role} onValueChange={(value) => setNewEmployee(prev => ({ ...prev, role: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="employer">Manager</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                  <SelectItem value="administrator">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select value={newEmployee.department} onValueChange={(value) => setNewEmployee(prev => ({ ...prev, department: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Select value={newEmployee.position} onValueChange={(value) => setNewEmployee(prev => ({ ...prev, position: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  {positions.map(pos => (
                    <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="salary">Salary (ZAR)</Label>
              <Input
                id="salary"
                type="number"
                value={newEmployee.salary}
                onChange={(e) => setNewEmployee(prev => ({ ...prev, salary: e.target.value }))}
                placeholder="Enter annual salary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hire_date">Hire Date</Label>
              <Input
                id="hire_date"
                type="date"
                value={newEmployee.hire_date}
                onChange={(e) => setNewEmployee(prev => ({ ...prev, hire_date: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setShowAddEmployee(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateEmployee} className="bg-slate-900 hover:bg-slate-800">
              Create Employee
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Employee Details Dialog */}
      {selectedEmployee && (
        <Dialog open={showEmployeeDetails} onOpenChange={setShowEmployeeDetails}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Employee Details - {selectedEmployee.name}</DialogTitle>
              <DialogDescription>View and edit employee information</DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm text-slate-500">Employee ID</Label>
                    <p className="text-slate-900">{selectedEmployee.employee_id}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-slate-500">Email</Label>
                    <p className="text-slate-900">{selectedEmployee.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-slate-500">Department</Label>
                    <p className="text-slate-900">{selectedEmployee.department}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-slate-500">Hire Date</Label>
                    <p className="text-slate-900">{new Date(selectedEmployee.hire_date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm text-slate-500">Position</Label>
                    <p className="text-slate-900">{selectedEmployee.position}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-slate-500">Status</Label>
                    <Badge variant="secondary" className={getStatusColor(selectedEmployee.status)}>
                      {selectedEmployee.status}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm text-slate-500">Performance Rating</Label>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= (selectedEmployee.performance_rating || 0)
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-slate-600">
                        {selectedEmployee.performance_rating || 0}/5
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-slate-500">KPI Score</Label>
                    <p className="text-slate-900">{selectedEmployee.kpi_score || 0}%</p>
                  </div>
                </div>
              </div>
              <Separator />
              <div className="flex justify-end space-x-2">
                <Button
                  variant="destructive"
                  onClick={() => handleDeleteEmployee(selectedEmployee.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Employee
                </Button>
                <Button variant="outline" onClick={() => setShowEmployeeDetails(false)}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Performance Review Dialog */}
      <Dialog open={showPerformanceReview} onOpenChange={setShowPerformanceReview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Performance Review</DialogTitle>
            <DialogDescription>Evaluate employee performance and set goals</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employee_select">Employee</Label>
                <Select value={reviewForm.employee_id} onValueChange={(value) => setReviewForm(prev => ({ ...prev, employee_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.name} - {emp.employee_id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="review_period">Review Period</Label>
                <Input
                  id="review_period"
                  value={reviewForm.review_period}
                  onChange={(e) => setReviewForm(prev => ({ ...prev, review_period: e.target.value }))}
                  placeholder="e.g., Q1 2025"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Overall Rating</Label>
                  <Select value={reviewForm.overall_rating.toString()} onValueChange={(value) => setReviewForm(prev => ({ ...prev, overall_rating: parseInt(value) }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map(rating => (
                        <SelectItem key={rating} value={rating.toString()}>{rating} Star{rating > 1 ? 's' : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Goals Achievement</Label>
                  <Select value={reviewForm.goals_achievement.toString()} onValueChange={(value) => setReviewForm(prev => ({ ...prev, goals_achievement: parseInt(value) }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map(rating => (
                        <SelectItem key={rating} value={rating.toString()}>{rating} Star{rating > 1 ? 's' : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Communication</Label>
                  <Select value={reviewForm.communication.toString()} onValueChange={(value) => setReviewForm(prev => ({ ...prev, communication: parseInt(value) }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map(rating => (
                        <SelectItem key={rating} value={rating.toString()}>{rating}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Teamwork</Label>
                  <Select value={reviewForm.teamwork.toString()} onValueChange={(value) => setReviewForm(prev => ({ ...prev, teamwork: parseInt(value) }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map(rating => (
                        <SelectItem key={rating} value={rating.toString()}>{rating}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Punctuality</Label>
                  <Select value={reviewForm.punctuality.toString()} onValueChange={(value) => setReviewForm(prev => ({ ...prev, punctuality: parseInt(value) }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map(rating => (
                        <SelectItem key={rating} value={rating.toString()}>{rating}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comments">Comments & Feedback</Label>
                <Textarea
                  id="comments"
                  value={reviewForm.comments}
                  onChange={(e) => setReviewForm(prev => ({ ...prev, comments: e.target.value }))}
                  placeholder="Provide detailed feedback and suggestions for improvement..."
                  rows={4}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setShowPerformanceReview(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePerformanceReview} className="bg-slate-900 hover:bg-slate-800">
              Create Review
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
