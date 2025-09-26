import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Separator } from './ui/separator';
import { toast } from 'sonner@2.0.3';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Download, 
  FileText, 
  Eye, 
  Edit, 
  Trash2,
  Phone,
  Mail,
  MapPin,
  Shield,
  Star,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
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
}

interface EmployeeManagementProps {
  isAdmin?: boolean;
  userId?: string;
}

export function EmployeeManagement({ isAdmin = false, userId }: EmployeeManagementProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [showEmployeeDetails, setShowEmployeeDetails] = useState(false);
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

  // Edit employee form data
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);

  const departments = [
    'Logistics', 'Operations', 'Finance', 'Human Resources', 
    'Administration', 'Maintenance', 'Customer Service'
  ];

  const positions = [
    'Driver', 'Dispatcher', 'Warehouse Manager', 'Mechanic', 
    'Account Manager', 'HR Manager', 'Operations Manager', 
    'Finance Manager', 'Administrator', 'Customer Service Rep'
  ];

  const roles = ['employee', 'employer', 'hr', 'administrator'];

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setIsLoading(true);
      const response = await api.getUsers();
      if (response.success) {
        setEmployees(response.data);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to fetch employees');
    } finally {
      setIsLoading(false);
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
        kpi_score: 0,
        password: `${newEmployee.username}123!` // Default password - should be changed on first login
      };

      const response = await api.createUser(employeeData);
      if (response.success) {
        toast.success('Employee created successfully!', {
          description: `Default password: ${employeeData.password}`
        });
        setShowAddEmployee(false);
        resetNewEmployeeForm();
        fetchEmployees();
      }
    } catch (error) {
      console.error('Error creating employee:', error);
      toast.error('Failed to create employee');
    }
  };

  const handleUpdateEmployee = async () => {
    try {
      if (!editEmployee) return;

      const response = await api.updateUser(editEmployee.id, editEmployee);
      if (response.success) {
        toast.success('Employee updated successfully!');
        setShowEmployeeDetails(false);
        setEditEmployee(null);
        fetchEmployees();
      }
    } catch (error) {
      console.error('Error updating employee:', error);
      toast.error('Failed to update employee');
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    try {
      if (window.confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
        const response = await api.deleteUser(employeeId);
        if (response.success) {
          toast.success('Employee deleted successfully!');
          setShowEmployeeDetails(false);
          fetchEmployees();
        }
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error('Failed to delete employee');
    }
  };

  const handleSuspendEmployee = async (employeeId: string) => {
    try {
      const response = await api.updateUser(employeeId, { status: 'suspended' });
      if (response.success) {
        toast.success('Employee suspended successfully!');
        fetchEmployees();
      }
    } catch (error) {
      console.error('Error suspending employee:', error);
      toast.error('Failed to suspend employee');
    }
  };

  const handleActivateEmployee = async (employeeId: string) => {
    try {
      const response = await api.updateUser(employeeId, { status: 'active' });
      if (response.success) {
        toast.success('Employee activated successfully!');
        fetchEmployees();
      }
    } catch (error) {
      console.error('Error activating employee:', error);
      toast.error('Failed to activate employee');
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
        const matchesRole = filterRole === 'all' || employee.role === filterRole;
        
        return matchesSearch && matchesStatus && matchesDepartment && matchesRole;
      });

      if (format === 'csv') {
        // Generate CSV locally
        let csvContent = 'Employee ID,Name,Email,Role,Department,Position,Status,Hire Date,Salary,Performance Rating,KPI Score\n';
        
        filteredEmployees.forEach(emp => {
          csvContent += `${emp.employee_id},"${emp.name}","${emp.email}","${emp.role}","${emp.department}","${emp.position}","${emp.status}","${emp.hire_date}","${emp.salary || 'N/A'}","${emp.performance_rating || 'N/A'}","${emp.kpi_score || 'N/A'}"\n`;
        });
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `logan_freights_employees_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        toast.success('Employee list exported as CSV successfully!');
      } else {
        // For Excel/PDF, create a more comprehensive export
        const exportData = filteredEmployees.map(emp => ({
          'Employee ID': emp.employee_id,
          'Full Name': emp.name,
          'Username': emp.username,
          'Email': emp.email,
          'Role': emp.role.charAt(0).toUpperCase() + emp.role.slice(1),
          'Department': emp.department,
          'Position': emp.position,
          'Status': emp.status.charAt(0).toUpperCase() + emp.status.slice(1),
          'Phone': emp.phone || 'N/A',
          'Hire Date': new Date(emp.hire_date).toLocaleDateString(),
          'Annual Salary (ZAR)': emp.salary ? `R${emp.salary.toLocaleString()}` : 'N/A',
          'Performance Rating': emp.performance_rating ? `${emp.performance_rating}/5` : 'Not Rated',
          'KPI Score': emp.kpi_score ? `${emp.kpi_score}%` : 'Not Set',
          'Created Date': new Date(emp.created_at).toLocaleDateString()
        }));

        if (format === 'excel') {
          // Create Excel-like content (would need actual Excel library in production)
          let content = 'Logan Freights Logistics CC - Employee Directory\n';
          content += `Generated: ${new Date().toLocaleDateString()}\n`;
          content += `Total Employees: ${exportData.length}\n\n`;
          
          // Add headers
          const headers = Object.keys(exportData[0] || {});
          content += headers.join('\t') + '\n';
          
          // Add data
          exportData.forEach(row => {
            content += headers.map(header => row[header]).join('\t') + '\n';
          });
          
          const blob = new Blob([content], { type: 'application/vnd.ms-excel' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `logan_freights_employees_${new Date().toISOString().split('T')[0]}.xls`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          
          toast.success('Employee list exported as Excel successfully!');
        } else if (format === 'pdf') {
          // Create PDF-like content (would need actual PDF library in production)
          let pdfContent = `Logan Freights Logistics CC - Employee Directory\n`;
          pdfContent += `Generated: ${new Date().toLocaleDateString()}\n`;
          pdfContent += `Total Employees: ${exportData.length}\n\n`;
          
          exportData.forEach(emp => {
            pdfContent += `${emp['Employee ID']} - ${emp['Full Name']}\n`;
            pdfContent += `  Email: ${emp['Email']}\n`;
            pdfContent += `  Role: ${emp['Role']} | Department: ${emp['Department']}\n`;
            pdfContent += `  Status: ${emp['Status']} | Hire Date: ${emp['Hire Date']}\n\n`;
          });
          
          const blob = new Blob([pdfContent], { type: 'application/pdf' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `logan_freights_employees_${new Date().toISOString().split('T')[0]}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          
          toast.success('Employee list exported as PDF successfully!');
        }
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export employee list');
    } finally {
      setIsExporting(false);
    }
  };

  const resetNewEmployeeForm = () => {
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
  };

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        employee.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        employee.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || employee.status === filterStatus;
    const matchesDepartment = filterDepartment === 'all' || employee.department === filterDepartment;
    const matchesRole = filterRole === 'all' || employee.role === filterRole;
    
    return matchesSearch && matchesStatus && matchesDepartment && matchesRole;
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

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
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
          <h2 className="text-2xl text-slate-900">Employee Management</h2>
          <p className="text-slate-600">Manage employee records and information</p>
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
            {isExporting ? 'Exporting...' : 'Export Excel'}
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

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
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
                <SelectItem value="pending">Pending</SelectItem>
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
            {isAdmin && (
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {roles.map(role => (
                    <SelectItem key={role} value={role}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Employees</p>
                <p className="text-2xl text-slate-900">{employees.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Active</p>
                <p className="text-2xl text-slate-900">
                  {employees.filter(emp => emp.status === 'active').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Pending</p>
                <p className="text-2xl text-slate-900">
                  {employees.filter(emp => emp.status === 'pending').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Departments</p>
                <p className="text-2xl text-slate-900">
                  {new Set(employees.map(emp => emp.department)).size}
                </p>
              </div>
              <MapPin className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-slate-900">Employee Directory</CardTitle>
          <CardDescription>
            Showing {filteredEmployees.length} of {employees.length} employees
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredEmployees.map((employee) => (
              <div key={employee.id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-center space-x-4">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={employee.profile_photo} />
                    <AvatarFallback className="bg-slate-900 text-white">
                      {getUserInitials(employee.name)}
                    </AvatarFallback>
                  </Avatar>
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
                      setEditEmployee(employee);
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
                      setEditEmployee(employee);
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

      {/* Add Employee Dialog */}
      <Dialog open={showAddEmployee} onOpenChange={setShowAddEmployee}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                  {isAdmin && (
                    <>
                      <SelectItem value="hr">HR</SelectItem>
                      <SelectItem value="administrator">Administrator</SelectItem>
                    </>
                  )}
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
              <Label htmlFor="salary">Annual Salary (ZAR)</Label>
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
            <Button variant="outline" onClick={() => {
              setShowAddEmployee(false);
              resetNewEmployeeForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreateEmployee} className="bg-slate-900 hover:bg-slate-800">
              Create Employee
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Employee Details Dialog */}
      {selectedEmployee && editEmployee && (
        <Dialog open={showEmployeeDetails} onOpenChange={setShowEmployeeDetails}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Employee Details - {selectedEmployee.name}</DialogTitle>
              <DialogDescription>View and edit employee information</DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="details" className="space-y-4">
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="actions">Actions</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_name">Full Name</Label>
                    <Input
                      id="edit_name"
                      value={editEmployee.name}
                      onChange={(e) => setEditEmployee(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_email">Email</Label>
                    <Input
                      id="edit_email"
                      value={editEmployee.email}
                      onChange={(e) => setEditEmployee(prev => prev ? ({ ...prev, email: e.target.value }) : null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_phone">Phone</Label>
                    <Input
                      id="edit_phone"
                      value={editEmployee.phone || ''}
                      onChange={(e) => setEditEmployee(prev => prev ? ({ ...prev, phone: e.target.value }) : null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_department">Department</Label>
                    <Select 
                      value={editEmployee.department} 
                      onValueChange={(value) => setEditEmployee(prev => prev ? ({ ...prev, department: value }) : null)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map(dept => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_position">Position</Label>
                    <Select 
                      value={editEmployee.position} 
                      onValueChange={(value) => setEditEmployee(prev => prev ? ({ ...prev, position: value }) : null)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {positions.map(pos => (
                          <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_salary">Annual Salary (ZAR)</Label>
                    <Input
                      id="edit_salary"
                      type="number"
                      value={editEmployee.salary || ''}
                      onChange={(e) => setEditEmployee(prev => prev ? ({ ...prev, salary: parseFloat(e.target.value) }) : null)}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="performance" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm text-slate-500">Performance Rating</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-5 h-5 ${
                              star <= (selectedEmployee.performance_rating || 0)
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-slate-900">
                        {selectedEmployee.performance_rating || 0}/5
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-slate-500">KPI Score</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{width: `${selectedEmployee.kpi_score || 0}%`}}
                        ></div>
                      </div>
                      <span className="text-slate-900">{selectedEmployee.kpi_score || 0}%</span>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="actions" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-slate-900 mb-2">Employee Status</h4>
                      <div className="flex space-x-2">
                        {selectedEmployee.status === 'suspended' ? (
                          <Button
                            variant="outline"
                            onClick={() => handleActivateEmployee(selectedEmployee.id)}
                            className="text-green-600 border-green-600 hover:bg-green-50"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Activate Employee
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={() => handleSuspendEmployee(selectedEmployee.id)}
                            className="text-yellow-600 border-yellow-600 hover:bg-yellow-50"
                          >
                            <AlertCircle className="w-4 h-4 mr-2" />
                            Suspend Employee
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-slate-900 mb-2">Danger Zone</h4>
                      <Button
                        variant="destructive"
                        onClick={() => handleDeleteEmployee(selectedEmployee.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Employee
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            <Separator />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => {
                setShowEmployeeDetails(false);
                setSelectedEmployee(null);
                setEditEmployee(null);
              }}>
                Cancel
              </Button>
              <Button onClick={handleUpdateEmployee} className="bg-slate-900 hover:bg-slate-800">
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}