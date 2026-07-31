import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

interface Employee {
  id: number;
  empNo: string;
  name: string;
  department: string;
  section: string;
  designation: string;
  phone: string | null;
  isActive: boolean;
  supervisorCode?: string | null;
}

interface AttendanceRecord {
  empId: number;
  empNo: string;
  userName: string;
  department: string;
  section: string;
  userRole: string;
  id: number;
  date: string;
  status: string;
  checkIn: string | null;
  checkOut: string | null;
  workedMinutes: number;
  remarks: string | null;
}

const formatDateForApi = (d: Date): string => {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const formatDateInput = (d: Date): string => {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
};

const inputToApi = (inputVal: string): string => {
  if (!inputVal) return '';
  const [yyyy, mm, dd] = inputVal.split('-');
  return `${dd}/${mm}/${yyyy}`;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  present: { label: 'Present', color: '#059669', bg: '#D1FAE5' },
  absent: { label: 'Absent', color: '#DC2626', bg: '#FEE2E2' },
  late: { label: 'Late', color: '#D97706', bg: '#FEF3C7' },
  half_day: { label: 'Half Day', color: '#7C3AED', bg: '#EDE9FE' },
  leave: { label: 'On Leave', color: '#2563EB', bg: '#EFF6FF' },
};

export default function Attendance() {
  const { user } = useAuth();
  const today = new Date();
  const [activeTab, setActiveTab] = useState<'register' | 'employees' | 'supervisor'>('register');

  useEffect(() => {
    if (user?.role === 'supervisor') {
      setActiveTab('supervisor');
      const storedSup = localStorage.getItem('crm_supervisor');
      if (storedSup) {
        const supInfo = JSON.parse(storedSup);
        setSupervisorInfo(supInfo);

        api.get(`/api/attendance/supervisor/team?sectionCode=${supInfo.sectionCode}&date=${formatDateForApi(new Date())}`)
          .then(res => {
            if (res.data?.ok) {
              setSupervisorTeam(res.data.records || []);
            }
          })
          .catch(err => console.error(err));
      }
    }
  }, [user]);

  // Register State
  const [selectedDateInput, setSelectedDateInput] = useState<string>(formatDateInput(today));
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>('ALL');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [savingEmpId, setSavingEmpId] = useState<number | null>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Search State (for both tabs)
  const [registerSearch, setRegisterSearch] = useState<string>('');
  const [employeeSearch, setEmployeeSearch] = useState<string>('');

  // Supervisor Login State
  const [supervisorPin, setSupervisorPin] = useState<string>('');
  const [supervisorInfo, setSupervisorInfo] = useState<any>(null);
  const [supervisorTeam, setSupervisorTeam] = useState<AttendanceRecord[]>([]);
  const [supervisorLoading, setSupervisorLoading] = useState<boolean>(false);
  const [supervisorError, setSupervisorError] = useState<string>('');
  const [savingSupEmpId, setSavingSupEmpId] = useState<number | null>(null);
  
  // Supervisor View Details State
  const [supTeamSearch, setSupTeamSearch] = useState<string>('');
  const [employeeDetail, setEmployeeDetail] = useState<AttendanceRecord | null>(null);

  // Strict 10-items-per-page Pagination State
  const [registerPage, setRegisterPage] = useState<number>(1);
  const [employeePage, setEmployeePage] = useState<number>(1);
  const [supTeamPage, setSupTeamPage] = useState<number>(1);


  // Supervisors List for dropdown assignment
  const [supervisorsList, setSupervisorsList] = useState<any[]>([]);

  // Employee Form & Bulk State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empNo, setEmpNo] = useState<string>('');
  const [empName, setEmpName] = useState<string>('');
  const [department, setDepartment] = useState<string>('Sales');
  const [section, setSection] = useState<string>('Sarees Division');
  const [designation, setDesignation] = useState<string>('Sales Executive');
  const [phone, setPhone] = useState<string>('');
  const [empSupervisorCode, setEmpSupervisorCode] = useState<string>('');
  const [submittingEmp, setSubmittingEmp] = useState<boolean>(false);
  const [bulkLoading, setBulkLoading] = useState<boolean>(false);

  // Edit Employee State
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [editEmpNo, setEditEmpNo] = useState<string>('');
  const [editName, setEditName] = useState<string>('');
  const [editDept, setEditDept] = useState<string>('');
  const [editSection, setEditSection] = useState<string>('');
  const [editDesig, setEditDesig] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editSupervisorCode, setEditSupervisorCode] = useState<string>('');
  const [updatingEmp, setUpdatingEmp] = useState<boolean>(false);

  // Group Edit State
  const [selectedEmpIds, setSelectedEmpIds] = useState<number[]>([]);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState<boolean>(false);
  const [groupDept, setGroupDept] = useState<string>('Sales');
  const [groupSection, setGroupSection] = useState<string>('Sarees Division');
  const [groupSupervisorCode, setGroupSupervisorCode] = useState<string>('');
  const [groupUpdateDept, setGroupUpdateDept] = useState<boolean>(true);
  const [groupUpdateSection, setGroupUpdateSection] = useState<boolean>(true);
  const [groupUpdateSupervisor, setGroupUpdateSupervisor] = useState<boolean>(true);
  const [updatingGroup, setUpdatingGroup] = useState<boolean>(false);

  const toggleSelectEmp = (id: number) => {
    setSelectedEmpIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllDisplayed = (displayedEmps: Employee[]) => {
    const displayedIds = displayedEmps.map(e => e.id);
    const allSelected = displayedIds.every(id => selectedEmpIds.includes(id));

    if (allSelected) {
      setSelectedEmpIds(prev => prev.filter(id => !displayedIds.includes(id)));
    } else {
      setSelectedEmpIds(prev => Array.from(new Set([...prev, ...displayedIds])));
    }
  };

  // Group Status State for Attendance Register
  const [selectedRegisterEmpIds, setSelectedRegisterEmpIds] = useState<number[]>([]);
  const [groupStatus, setGroupStatus] = useState<string>('present');
  const [updatingRegisterGroup, setUpdatingRegisterGroup] = useState<boolean>(false);

  const toggleSelectRegisterEmp = (id: number) => {
    setSelectedRegisterEmpIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const toggleSelectAllRegister = (displayedEmps: AttendanceRecord[]) => {
    const displayedIds = displayedEmps.map(e => e.empId);
    const allSelected = displayedIds.length > 0 && displayedIds.every(id => selectedRegisterEmpIds.includes(id));
    if (allSelected) {
      setSelectedRegisterEmpIds(prev => prev.filter(id => !displayedIds.includes(id)));
    } else {
      setSelectedRegisterEmpIds(prev => Array.from(new Set([...prev, ...displayedIds])));
    }
  };

  const handleGroupStatusSubmit = async () => {
    if (selectedRegisterEmpIds.length === 0) return;
    try {
      setUpdatingRegisterGroup(true);
      setError(''); setSuccess('');
      const apiDate = inputToApi(selectedDateInput);
      
      const promises = selectedRegisterEmpIds.map(empId => 
        api.post('/api/attendance/upsert', {
          empId,
          date: apiDate,
          status: groupStatus,
          markedByName: user?.name
        })
      );
      await Promise.all(promises);
      
      setSuccess(`Group Edit Success: Marked ${selectedRegisterEmpIds.length} employee(s) as ${STATUS_CONFIG[groupStatus]?.label || groupStatus}.`);
      setSelectedRegisterEmpIds([]);
      fetchAttendance();
    } catch {
      setError('Error performing group status edit.');
    } finally {
      setUpdatingRegisterGroup(false);
    }
  };

  // Group Status State for Supervisor Team
  const [selectedSupTeamEmpIds, setSelectedSupTeamEmpIds] = useState<number[]>([]);
  const [supGroupStatus, setSupGroupStatus] = useState<string>('present');
  const [updatingSupGroup, setUpdatingSupGroup] = useState<boolean>(false);

  const toggleSelectSupTeamEmp = (id: number) => {
    setSelectedSupTeamEmpIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const toggleSelectAllSupTeam = (displayedEmps: AttendanceRecord[]) => {
    const displayedIds = displayedEmps.map(e => e.empId);
    const allSelected = displayedIds.length > 0 && displayedIds.every(id => selectedSupTeamEmpIds.includes(id));
    if (allSelected) {
      setSelectedSupTeamEmpIds(prev => prev.filter(id => !displayedIds.includes(id)));
    } else {
      setSelectedSupTeamEmpIds(prev => Array.from(new Set([...prev, ...displayedIds])));
    }
  };

  const handleSupGroupStatusSubmit = async () => {
    if (selectedSupTeamEmpIds.length === 0) return;
    try {
      setUpdatingSupGroup(true);
      setSupervisorError('');
      
      const promises = selectedSupTeamEmpIds.map(empId => 
        api.post('/api/attendance/upsert', {
          empId,
          date: formatDateForApi(new Date()),
          status: supGroupStatus,
          markedByName: supervisorInfo?.name
        })
      );
      await Promise.all(promises);
      
      setSelectedSupTeamEmpIds([]);
      // refetch team
      const res = await api.get(`/api/attendance/supervisor/team?sectionCode=${supervisorInfo.sectionCode}&date=${formatDateForApi(new Date())}`);
      if (res.data?.ok) setSupervisorTeam(res.data.records || []);
    } catch {
      setSupervisorError('Error performing bulk status edit.');
    } finally {
      setUpdatingSupGroup(false);
    }
  };

  const handleGroupEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedEmpIds.length === 0) return;

    if (!groupUpdateDept && !groupUpdateSection && !groupUpdateSupervisor) {
      setError('Please select at least one field to update (Department, Section, or Supervisor).');
      return;
    }

    try {
      setUpdatingGroup(true);
      setError('');
      setSuccess('');

      const res = await api.put('/api/attendance/employees/group-edit', {
        empIds: selectedEmpIds,
        department: groupDept,
        section: groupSection,
        supervisorCode: groupSupervisorCode || null,
        updateDepartment: groupUpdateDept,
        updateSection: groupUpdateSection,
        updateSupervisorCode: groupUpdateSupervisor
      });

      if (res.data?.ok) {
        setSuccess(`Group Edit Success: Updated ${res.data.count || selectedEmpIds.length} employee(s).`);
        setIsGroupModalOpen(false);
        setSelectedEmpIds([]);
        fetchEmployees();
        fetchAttendance();
      } else {
        setError(res.data?.error || 'Failed to update employees in group.');
      }
    } catch {
      setError('Error performing group edit.');
    } finally {
      setUpdatingGroup(false);
    }
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmp) return;

    try {
      setUpdatingEmp(true);
      setError('');
      setSuccess('');

      const res = await api.put(`/api/attendance/employees/${editingEmp.id}`, {
        empNo: editEmpNo,
        name: editName,
        department: editDept,
        section: editSection,
        designation: editDesig,
        phone: editPhone,
        supervisorCode: editSupervisorCode || null
      });

      if (res.data?.ok) {
        setSuccess(`Completed: Updated employee details for ${editName} (${editEmpNo}).`);
        setEditingEmp(null);
        fetchEmployees();
        fetchAttendance();
      } else {
        setError(res.data?.error || 'Failed to update employee details.');
      }
    } catch {
      setError('Error updating employee record.');
    } finally {
      setUpdatingEmp(false);
    }
  };


  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const apiDate = inputToApi(selectedDateInput);
      const res = await api.get('/api/attendance', { params: { date: apiDate } });
      if (res.data?.ok) {
        setRecords(res.data.records || []);
      } else {
        setError(res.data?.error || 'Failed to load attendance records.');
      }
    } catch {
      setError('Could not connect to attendance server.');
    } finally {
      setLoading(false);
    }
  }, [selectedDateInput]);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await api.get('/api/attendance/employees');
      if (res.data?.ok) {
        setEmployees(res.data.employees || []);
      }
    } catch {
      console.error('Failed to load employee list.');
    }
  }, []);

  const fetchSupervisorsList = useCallback(async () => {
    try {
      const res = await api.get('/api/attendance/supervisors');
      if (res.data?.ok) setSupervisorsList(res.data.supervisors || []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchAttendance();
    fetchSupervisorsList();
  }, [fetchAttendance, fetchSupervisorsList]);

  useEffect(() => {
    if (activeTab === 'employees') {
      fetchEmployees();
    }
  }, [activeTab, fetchEmployees]);

  useEffect(() => {
    setRegisterPage(1);
  }, [registerSearch, selectedSectionFilter]);

  useEffect(() => {
    setEmployeePage(1);
  }, [employeeSearch]);

  // Filtered records by floor/section AND search
  const filteredRecords = records
    .filter(r => selectedSectionFilter === 'ALL' || r.section.toLowerCase().includes(selectedSectionFilter.toLowerCase()) || r.department.toLowerCase().includes(selectedSectionFilter.toLowerCase()))
    .filter(r => {
      if (!registerSearch.trim()) return true;
      const q = registerSearch.toLowerCase();
      return r.empNo.toLowerCase().includes(q) || r.userName.toLowerCase().includes(q);
    });

  const totalRegisterPages = Math.ceil(filteredRecords.length / 10) || 1;
  const paginatedRegisterRecords = filteredRecords.slice((registerPage - 1) * 10, registerPage * 10);


  // Calculate stats
  const stats = {
    total: filteredRecords.length,
    present: filteredRecords.filter(r => r.status === 'present').length,
    absent: filteredRecords.filter(r => r.status === 'absent').length,
    late: filteredRecords.filter(r => r.status === 'late').length,
    leave: filteredRecords.filter(r => r.status === 'leave').length,
  };

  const handleRowStatusChange = (empId: number, field: string, val: any) => {
    setRecords(prev => prev.map(r => {
      if (r.empId === empId) {
        return { ...r, [field]: val };
      }
      return r;
    }));
  };

  const handleSaveRow = async (record: AttendanceRecord) => {
    try {
      setSavingEmpId(record.empId);
      setError('');
      setSuccess('');
      const apiDate = inputToApi(selectedDateInput);

      let workedMin = record.workedMinutes || 0;
      if (record.checkIn && record.checkOut) {
        const [inH, inM] = record.checkIn.split(':').map(Number);
        const [outH, outM] = record.checkOut.split(':').map(Number);
        if (!isNaN(inH) && !isNaN(outH)) {
          workedMin = (outH * 60 + outM) - (inH * 60 + inM);
          if (workedMin < 0) workedMin = 0;
        }
      }

      const res = await api.post('/api/attendance/upsert', {
        empId: record.empId,
        date: apiDate,
        status: record.status,
        checkIn: record.checkIn || null,
        checkOut: record.checkOut || null,
        workedMinutes: workedMin,
        remarks: record.remarks || null
      });

      if (res.data?.ok) {
        setSuccess(`Completed: Attendance record saved for ${record.userName}.`);
        fetchAttendance();
      } else {
        setError(res.data?.error || 'Failed to update attendance.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save attendance.');
    } finally {
      setSavingEmpId(null);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empNo || !empName) {
      setError('Employee No and Name are mandatory.');
      return;
    }


    try {
      setSubmittingEmp(true);
      setError('');
      setSuccess('');

      const res = await api.post('/api/attendance/employees', {
        empNo,
        name: empName,
        department,
        section,
        designation,
        phone,
        supervisorCode: empSupervisorCode || null
      });

      if (res.data?.ok) {
        setSuccess(`Completed: Employee ${empName} (${empNo}) registered to staff roster!`);
        setEmpNo('');
        setEmpName('');
        setPhone('');
        setEmpSupervisorCode('');
        fetchEmployees();
        fetchAttendance();
      } else {
        setError(res.data?.error || 'Failed to add employee.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error adding employee.');
    } finally {
      setSubmittingEmp(false);
    }
  };

  const handleDownloadSampleCsv = () => {
    const csvContent = "empNo,name,department,section,designation,phone,supervisorCode\nEMP-201,Ramesh Naik,Sales,Sarees Division,Sales Executive,9876543210,SAREE-1\nEMP-202,Pooja Sharma,Billing,Cash Counter 2,Cashier,9876543211,CASH-1";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "Sample_Employee_Bulk_Import.csv";
    a.click();
    URL.revokeObjectURL(url);
  };


  const handleBulkCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setBulkLoading(true);
        setError('');
        setSuccess('');
        const text = event.target?.result as string;
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length <= 1) {
          setError('CSV file is empty or missing headers.');
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const empNoIdx = headers.indexOf('empno');
        const nameIdx = headers.indexOf('name');
        const deptIdx = headers.indexOf('department');
        const secIdx = headers.indexOf('section');
        const desigIdx = headers.indexOf('designation');
        const phoneIdx = headers.indexOf('phone');
        let supIdx = headers.indexOf('supervisorcode');
        if (supIdx === -1) supIdx = headers.indexOf('supervisor code');
        if (supIdx === -1) supIdx = headers.indexOf('supervisor_code');
        if (supIdx === -1) supIdx = headers.indexOf('supervisor');

        if (empNoIdx === -1 || nameIdx === -1) {
          setError('CSV file must contain "empNo" and "name" column headers.');
          return;
        }

        const parsedEmps = [];
        for (let i = 1; i < lines.length; i++) {
          const row = lines[i].split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));
          if (row.length > empNoIdx && row[empNoIdx]) {
            parsedEmps.push({
              empNo: row[empNoIdx],
              name: row[nameIdx] || 'Staff Member',
              department: row[deptIdx] || 'Sales',
              section: row[secIdx] || 'Main Floor',
              designation: row[desigIdx] || 'Sales Executive',
              phone: row[phoneIdx] || null,
              supervisorCode: (supIdx !== -1 && row[supIdx]) ? row[supIdx] : null
            });
          }
        }


        if (parsedEmps.length === 0) {
          setError('No valid employee rows parsed from CSV file.');
          return;
        }

        const res = await api.post('/api/attendance/employees/bulk', { employees: parsedEmps });
        if (res.data?.ok) {
          setSuccess(`Completed: Bulk uploaded ${res.data.inserted} employee records successfully!`);
          fetchEmployees();
          fetchAttendance();
        } else {
          setError(res.data?.error || 'Bulk upload failed.');
        }
      } catch (err: any) {
        setError('Failed to parse CSV file.');
      } finally {
        setBulkLoading(false);
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteEmployee = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from the active staff roster?`)) return;
    try {
      const res = await api.delete(`/api/attendance/employees/${id}`);
      if (res.data?.ok) {
        setSuccess(`Employee ${name} removed.`);
        fetchEmployees();
        fetchAttendance();
      }
    } catch {
      setError('Could not remove employee.');
    }
  };

  const handleExportCSV = () => {
    const apiDate = inputToApi(selectedDateInput);
    const lines = [
      `BSC Retail CRM — Staff Attendance Register — ${apiDate}`,
      '',
      'Emp No,Name,Department,Section,Designation,Status,Check-In,Check-Out,Hours Worked',
      ...records.map(r => {
        const hrs = r.workedMinutes ? `${Math.floor(r.workedMinutes / 60)}h ${r.workedMinutes % 60}m` : '—';
        return `"${r.empNo}","${r.userName}","${r.department}","${r.section}","${r.userRole}","${r.status}","${r.checkIn || ''}","${r.checkOut || ''}","${hrs}"`;
      })
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Attendance_${apiDate.replace(/\//g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSupervisorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSupervisorError('');
    setSupervisorLoading(true);
    try {
      const res = await api.post('/api/attendance/supervisor/login', { pin: supervisorPin });
      if (res.data?.ok) {
        setSupervisorInfo(res.data.supervisor);
        // Load team attendance
        const teamRes = await api.get(`/api/attendance/supervisor/team?sectionCode=${res.data.supervisor.sectionCode}&date=${inputToApi(new Date())}`);
        if (teamRes.data?.ok) {
          setSupervisorTeam(teamRes.data.records || []);
        }
      }
    } catch (err: any) {
      setSupervisorError(err.response?.data?.error || 'Invalid PIN.');
    } finally {
      setSupervisorLoading(false);
    }
  };

  const handleSaveSupRow = async (record: AttendanceRecord) => {
    try {
      setSavingSupEmpId(record.empId);
      const apiDate = inputToApi(new Date());
      let workedMin = 0;
      if (record.checkIn && record.checkOut) {
        const [inH, inM] = record.checkIn.split(':').map(Number);
        const [outH, outM] = record.checkOut.split(':').map(Number);
        workedMin = Math.max(0, (outH * 60 + outM) - (inH * 60 + inM));
      }
      await api.post('/api/attendance/upsert', {
        empId: record.empId,
        date: apiDate,
        status: record.status,
        checkIn: record.checkIn || null,
        checkOut: record.checkOut || null,
        workedMinutes: workedMin,
        remarks: record.remarks || null,
        markedByName: supervisorInfo?.name || 'Section Supervisor'
      });
      setSuccess(`Saved attendance for ${record.userName}.`);
      setSupervisorTeam(prev => prev.map(r => r.empId === record.empId ? { ...r } : r));
    } catch {
      setError('Failed to save attendance.');
    } finally {
      setSavingSupEmpId(null);
    }
  };

  const handleSupRowChange = (empId: number, field: string, val: any) => {
    setSupervisorTeam(prev => prev.map(r => r.empId === empId ? { ...r, [field]: val } : r));
  };

  const filteredSupTeam = supervisorTeam.filter(r => 
    r.userName.toLowerCase().includes(supTeamSearch.toLowerCase()) || 
    r.empNo.toLowerCase().includes(supTeamSearch.toLowerCase())
  );

  return (
    <div className="page-container fade-in">
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="outfit" style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px' }}>
            Staff Attendance & Roster Management
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
            Manage employee master data, mark daily presence, check-in/out times, and working hours
          </p>
        </div>

        {/* Tab Navigation & Export */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', maxWidth: '100%' }}>
          <div className="scroll-tabs" style={{ display: 'flex', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '4px', gap: '2px' }}>
            {user?.role !== 'supervisor' && (
              <>
                <button
                  onClick={() => setActiveTab('register')}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                    background: activeTab === 'register' ? '#4F46E5' : 'transparent',
                    color: activeTab === 'register' ? '#FFFFFF' : '#64748B',
                    border: 'none', cursor: 'pointer'
                  }}
                >
                  📋 Attendance Register
                </button>
                <button
                  onClick={() => setActiveTab('employees')}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                    background: activeTab === 'employees' ? '#4F46E5' : 'transparent',
                    color: activeTab === 'employees' ? '#FFFFFF' : '#64748B',
                    border: 'none', cursor: 'pointer'
                  }}
                >
                  👥 Employee Master
                </button>
              </>
            )}
            <button
              onClick={() => setActiveTab('supervisor')}
              style={{
                padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                background: activeTab === 'supervisor' ? '#D97706' : 'transparent',
                color: activeTab === 'supervisor' ? '#FFFFFF' : '#64748B',
                border: 'none', cursor: 'pointer'
              }}
            >
              🔐 {user?.role === 'supervisor' ? 'My Team Roster' : 'Section Login'}
            </button>
          </div>

          {activeTab === 'register' && (
            <button
              onClick={handleExportCSV}
              disabled={records.length === 0}
              style={{
                padding: '9px 18px', borderRadius: '10px', fontSize: '12px', fontWeight: 700,
                background: '#10B981', color: '#FFFFFF', border: 'none', cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              📥 Export CSV
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* TAB 1: DAILY ATTENDANCE REGISTER */}
      {activeTab === 'register' && (
        <>
          {/* Summary KPI Ribbon */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '12px',
              marginBottom: '24px',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '14px',
              padding: '20px 24px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
            }}
          >
            {[
              { label: 'Total Staff', value: stats.total, icon: '👥', color: '#0F172A' },
              { label: 'Present', value: stats.present, icon: '✅', color: '#10B981' },
              { label: 'Absent', value: stats.absent, icon: '❌', color: '#EF4444' },
              { label: 'Late', value: stats.late, icon: '⏰', color: '#F59E0B' },
              { label: 'On Leave', value: stats.leave, icon: '🏖️', color: '#3B82F6' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', marginBottom: '2px' }}>{s.icon}</div>
                <div className="mono" style={{ fontSize: '26px', fontWeight: 800, color: s.color, lineHeight: 1.1 }}>{s.value}</div>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Date Picker & Floor Filter Bar */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '16px 20px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>📅 Date:</span>
                <input
                  type="date"
                  value={selectedDateInput}
                  onChange={(e) => setSelectedDateInput(e.target.value)}
                  style={{
                    padding: '8px 14px', borderRadius: '8px', border: '1px solid #CBD5E1',
                    fontSize: '13px', fontWeight: 600, color: '#0F172A', background: '#FAF7F2'
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>🏢 Floor:</span>
                <select
                  value={selectedSectionFilter}
                  onChange={(e) => setSelectedSectionFilter(e.target.value)}
                  style={{
                    padding: '8px 14px', borderRadius: '8px', border: '1px solid #CBD5E1',
                    fontSize: '13px', fontWeight: 700, color: '#4F46E5', background: '#FAF7F2', cursor: 'pointer'
                  }}
                >
                  <option value="ALL">All Store Floors & Sections</option>
                  <option value="Sarees">Sarees Division</option>
                  <option value="Mens">Mens Suitings & Wear</option>
                  <option value="Kids">Kids & Ladies Wear</option>
                  <option value="Cash">Cash Counters</option>
                  <option value="Ground Floor">Ground Floor</option>
                  <option value="First Floor">First Floor</option>
                  <option value="Second Floor">Second Floor</option>
                  <option value="Godown">GODOWN</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              {/* Search by Emp No or Name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="🔍 Search by Emp No or Name..."
                  value={registerSearch}
                  onChange={(e) => setRegisterSearch(e.target.value)}
                  style={{
                    padding: '8px 14px', borderRadius: '8px', border: '1px solid #CBD5E1',
                    fontSize: '13px', color: '#0F172A', background: '#FAF7F2', width: '220px'
                  }}
                />
              </div>
            </div>

            <div style={{ fontSize: '12px', color: '#64748B' }}>
              Showing <span style={{ fontWeight: 800, color: '#0F172A' }}>{filteredRecords.length}</span> staff members
            </div>
          </div>

          {/* Register Table */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h3 className="outfit" style={{ fontSize: '17px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Daily Register Sheet
                </h3>
                {selectedRegisterEmpIds.length > 0 && (
                  <span style={{ fontSize: '12px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px', background: '#EEF2FF', color: '#4F46E5', border: '1px solid #C7D2FE' }}>
                    {selectedRegisterEmpIds.length} selected
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {selectedRegisterEmpIds.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F8FAFC', padding: '6px 12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Mark Selected As:</span>
                    <select
                      value={groupStatus}
                      onChange={(e) => setGroupStatus(e.target.value)}
                      style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, border: '1px solid #CBD5E1', cursor: 'pointer' }}
                    >
                      <option value="present">✅ Present</option>
                      <option value="absent">❌ Absent</option>
                      <option value="late">⏰ Late</option>
                      <option value="half_day">🌓 Half Day</option>
                      <option value="leave">🏖️ On Leave</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleGroupStatusSubmit}
                      disabled={updatingRegisterGroup}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 800,
                        background: updatingRegisterGroup ? '#94A3B8' : '#4F46E5',
                        color: '#FFFFFF',
                        border: 'none',
                        cursor: updatingRegisterGroup ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {updatingRegisterGroup ? 'Saving...' : 'Apply Status'}
                    </button>
                  </div>
                )}
                <span style={{ fontSize: '12px', color: '#64748B' }}>
                  Showing {records.length} staff records
                </span>
              </div>
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                <div className="spinner" style={{ width: '28px', height: '28px' }} />
              </div>
            ) : records.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 24px', background: '#FAF7F2', borderRadius: '12px', border: '1px dashed #CBD5E1' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>👥</div>
                <p style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>No staff registered yet</p>
                <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
                  Click on "Employee Master" tab to add your store employees.
                </p>
              </div>
            ) : (
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>
                        <input
                          type="checkbox"
                          checked={paginatedRegisterRecords.length > 0 && paginatedRegisterRecords.every(r => selectedRegisterEmpIds.includes(r.empId))}
                          onChange={() => toggleSelectAllRegister(paginatedRegisterRecords)}
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                      </th>
                      <th>Emp No</th>
                      <th>Employee Name</th>
                      <th>Department / Section</th>
                      <th>Designation</th>
                      <th>Status</th>
                      <th>Check-In</th>
                      <th>Check-Out</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRegisterRecords.map((r) => {
                      const isSaving = savingEmpId === r.empId;
                      return (
                        <tr key={r.empId} style={{ background: selectedRegisterEmpIds.includes(r.empId) ? '#EEF2FF' : 'transparent' }}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedRegisterEmpIds.includes(r.empId)}
                              onChange={() => toggleSelectRegisterEmp(r.empId)}
                              style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                            />
                          </td>
                          <td className="mono" style={{ fontWeight: 800, color: '#4F46E5', fontSize: '12px' }}>
                            {r.empNo}
                          </td>
                          <td style={{ fontWeight: 700, color: '#0F172A' }}>
                            {r.userName}
                          </td>
                          <td style={{ fontSize: '12px', color: '#475569' }}>
                            <div>{r.department}</div>
                            <div style={{ fontSize: '11px', color: '#94A3B8' }}>{r.section}</div>
                          </td>
                          <td style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>
                            {r.userRole}
                          </td>
                          <td>
                            <select
                              value={r.status}
                              onChange={(e) => handleRowStatusChange(r.empId, 'status', e.target.value)}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 700,
                                background: STATUS_CONFIG[r.status]?.bg || '#F1F5F9',
                                color: STATUS_CONFIG[r.status]?.color || '#475569',
                                border: '1px solid #CBD5E1',
                                cursor: 'pointer'
                              }}
                            >
                              <option value="present">✅ Present</option>
                              <option value="absent">❌ Absent</option>
                              <option value="late">⏰ Late</option>
                              <option value="half_day">🌓 Half Day</option>
                              <option value="leave">🏖️ On Leave</option>
                            </select>
                          </td>
                          <td>
                            <input
                              type="time"
                              value={r.checkIn || ''}
                              onChange={(e) => handleRowStatusChange(r.empId, 'checkIn', e.target.value)}
                              style={{ padding: '6px 8px', fontSize: '12px', borderRadius: '6px', border: '1px solid #CBD5E1', width: '105px' }}
                            />
                          </td>
                          <td>
                            <input
                              type="time"
                              value={r.checkOut || ''}
                              onChange={(e) => handleRowStatusChange(r.empId, 'checkOut', e.target.value)}
                              style={{ padding: '6px 8px', fontSize: '12px', borderRadius: '6px', border: '1px solid #CBD5E1', width: '105px' }}
                            />
                          </td>
                          <td>
                            <button
                              onClick={() => handleSaveRow(r)}
                              disabled={isSaving}
                              style={{
                                padding: '6px 14px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 700,
                                background: '#1E293B',
                                color: '#FFFFFF',
                                border: 'none',
                                cursor: 'pointer'
                              }}
                            >
                              {isSaving ? '...' : 'Save'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {filteredRecords.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', flexWrap: 'wrap', gap: '12px', background: '#F8FAFC', padding: '12px 16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '12px', color: '#64748B' }}>
                  Showing <span style={{ fontWeight: 800, color: '#0F172A' }}>{Math.min(filteredRecords.length, (registerPage - 1) * 10 + 1)}–{Math.min(filteredRecords.length, registerPage * 10)}</span> of <span style={{ fontWeight: 800, color: '#0F172A' }}>{filteredRecords.length}</span> staff records (Strictly 10 per page)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setRegisterPage(p => Math.max(1, p - 1))}
                    disabled={registerPage === 1}
                    style={{ padding: '6px 14px', borderRadius: '8px', background: registerPage === 1 ? '#F1F5F9' : '#EEF2FF', color: registerPage === 1 ? '#94A3B8' : '#4F46E5', border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: 800, cursor: registerPage === 1 ? 'not-allowed' : 'pointer' }}
                  >
                    ◄ Prev 10
                  </button>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A', padding: '0 6px' }}>
                    Page {registerPage} of {totalRegisterPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setRegisterPage(p => Math.min(totalRegisterPages, p + 1))}
                    disabled={registerPage >= totalRegisterPages}
                    style={{ padding: '6px 14px', borderRadius: '8px', background: registerPage >= totalRegisterPages ? '#F1F5F9' : '#EEF2FF', color: registerPage >= totalRegisterPages ? '#94A3B8' : '#4F46E5', border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: 800, cursor: registerPage >= totalRegisterPages ? 'not-allowed' : 'pointer' }}
                  >
                    Next 10 ►
                  </button>
                </div>
              </div>
            )}

          </div>
        </>
      )}

      {/* TAB 2: EMPLOYEE MASTER & BULK REGISTRATION */}
      {activeTab === 'employees' && (
        <div className="responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', alignItems: 'start' }}>

          {/* Left Column: Form & Bulk Upload Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Add Single Employee Form */}
            <div className="glass-card" style={{ padding: '24px' }}>
              <h3 className="outfit" style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '16px' }}>
                ➕ Register Single Staff Member
              </h3>

              <form onSubmit={handleCreateEmployee}>
                <div className="field">
                  <label>Employee No <span className="req">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. EMP-106"
                    value={empNo}
                    onChange={(e) => setEmpNo(e.target.value)}
                    required
                  />
                </div>

                <div className="field">
                  <label>Full Employee Name <span className="req">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. Anil Kumar"
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    required
                  />
                </div>

                <div className="field">
                  <label>Department <span className="req">*</span></label>
                  <select value={department} onChange={(e) => setDepartment(e.target.value)}>
                    <option value="Sales">Sales</option>
                    <option value="Billing & Cash">Billing & Cash</option>
                    <option value="Visual Merchandising">Visual Merchandising</option>
                    <option value="Inventory & Stock">Inventory & Stock</option>
                    <option value="Customer Relations">Customer Relations</option>
                    <option value="Security & Facility">Security & Facility</option>
                    <option value="Store Management">Store Management</option>
                    <option value="Others">Others</option>
                  </select>
                </div>

                <div className="field">
                  <label>Floor Section <span className="req">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. Sarees Division / Cash Counter 1"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    required
                  />
                </div>

                <div className="field">
                  <label>Assigned Section Supervisor</label>
                  <select value={empSupervisorCode} onChange={(e) => setEmpSupervisorCode(e.target.value)}>
                    <option value="">-- Direct / Unassigned --</option>
                    {supervisorsList.map(sup => (
                      <option key={sup.id} value={sup.sectionCode}>
                        {sup.name} ({sup.sectionCode} — {sup.sectionName || sup.floor})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label>Designation <span className="req">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Sales Executive"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    required
                  />
                </div>


                <div className="field">
                  <label>Phone Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 9845012345"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingEmp}
                  className="btn btn-primary btn-full"
                  style={{ background: '#4F46E5', marginTop: '8px' }}
                >
                  {submittingEmp ? 'Adding...' : '➕ Register Employee'}
                </button>
              </form>
            </div>

            {/* Bulk CSV Employee Upload Card */}
            <div className="glass-card" style={{ padding: '24px', background: '#F8FAFC' }}>
              <h4 className="outfit" style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📁 Bulk Employee Entry (CSV File)
              </h4>
              <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '16px' }}>
                Upload multiple staff members in one click via CSV spreadsheet
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  type="button"
                  onClick={handleDownloadSampleCsv}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    background: '#FFFFFF',
                    color: '#4F46E5',
                    border: '1px solid #C7D2FE',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  📥 Download Sample CSV Template
                </button>

                <label
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    background: bulkLoading ? '#CBD5E1' : '#10B981',
                    color: '#FFFFFF',
                    textAlign: 'center',
                    cursor: bulkLoading ? 'not-allowed' : 'pointer',
                    display: 'block'
                  }}
                >
                  {bulkLoading ? 'Processing Bulk CSV...' : '📤 Choose CSV File & Bulk Import'}
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleBulkCsvUpload}
                    disabled={bulkLoading}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Employee Directory List */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <h3 className="outfit" style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  👥 Active Employee Roster Directory
                </h3>
                {selectedEmpIds.length > 0 && (
                  <span style={{ fontSize: '12px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px', background: '#EEF2FF', color: '#4F46E5', border: '1px solid #C7D2FE' }}>
                    {selectedEmpIds.length} selected
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedEmpIds.length === 0) {
                      setError('Please select employees using checkboxes to perform group edit.');
                    } else {
                      setIsGroupModalOpen(true);
                    }
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 800,
                    background: selectedEmpIds.length > 0 ? 'linear-gradient(135deg, #4F46E5 0%, #3730A3 100%)' : '#F1F5F9',
                    color: selectedEmpIds.length > 0 ? '#FFFFFF' : '#64748B',
                    border: selectedEmpIds.length > 0 ? 'none' : '1px solid #CBD5E1',
                    cursor: 'pointer',
                    boxShadow: selectedEmpIds.length > 0 ? '0 4px 12px rgba(79,70,229,0.3)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span>⚙️ Group Edit</span>
                  {selectedEmpIds.length > 0 && (
                    <span style={{ background: 'rgba(255,255,255,0.25)', padding: '2px 8px', borderRadius: '12px', fontSize: '11px' }}>
                      {selectedEmpIds.length}
                    </span>
                  )}
                </button>

                <input
                  type="text"
                  placeholder="🔍 Search by Emp No or Name..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  style={{
                    padding: '8px 14px', borderRadius: '8px', border: '1px solid #CBD5E1',
                    fontSize: '13px', color: '#0F172A', background: '#FAF7F2', width: '220px'
                  }}
                />
              </div>
            </div>

            {selectedEmpIds.length > 0 && (
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'linear-gradient(90deg, #EEF2FF 0%, #E0E7FF 100%)',
                padding: '10px 16px', borderRadius: '8px', border: '1px solid #C7D2FE',
                marginBottom: '16px', fontSize: '13px', flexWrap: 'wrap', gap: '8px'
              }}>
                <div style={{ color: '#3730A3', fontWeight: 700 }}>
                  ⚡ <strong>{selectedEmpIds.length}</strong> employee(s) selected for bulk changes.
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setIsGroupModalOpen(true)}
                    style={{ padding: '6px 14px', borderRadius: '6px', background: '#4F46E5', color: '#FFF', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '12px' }}
                  >
                    ⚙️ Group Edit (Supervisor / Dept / Section)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedEmpIds([])}
                    style={{ padding: '6px 12px', borderRadius: '6px', background: '#FFFFFF', color: '#475569', fontWeight: 700, border: '1px solid #CBD5E1', cursor: 'pointer', fontSize: '12px' }}
                  >
                    Deselect All
                  </button>
                </div>
              </div>
            )}

            {employees.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8', fontSize: '13px' }}>
                No employees registered in master roster.
              </div>
            ) : (
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      {(() => {
                        const filtered = employees.filter(emp => {
                          if (!employeeSearch.trim()) return true;
                          const q = employeeSearch.toLowerCase();
                          return emp.empNo.toLowerCase().includes(q) || emp.name.toLowerCase().includes(q) || emp.department.toLowerCase().includes(q) || emp.section.toLowerCase().includes(q);
                        });
                        const displayed = filtered.slice((employeePage - 1) * 10, employeePage * 10);
                        const isAllSelected = displayed.length > 0 && displayed.every(emp => selectedEmpIds.includes(emp.id));

                        return (
                          <th style={{ width: '40px', textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={isAllSelected}
                              onChange={() => toggleSelectAllDisplayed(displayed)}
                              title="Select / Deselect all visible employees on page"
                              style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                            />
                          </th>
                        );
                      })()}
                      <th>Emp No</th>
                      <th>Name</th>
                      <th>Department / Section</th>
                      <th>Supervisor Code</th>
                      <th>Designation</th>
                      <th>Phone</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filtered = employees.filter(emp => {
                        if (!employeeSearch.trim()) return true;
                        const q = employeeSearch.toLowerCase();
                        return emp.empNo.toLowerCase().includes(q) || emp.name.toLowerCase().includes(q) || emp.department.toLowerCase().includes(q) || emp.section.toLowerCase().includes(q);
                      });
                      const displayed = filtered.slice((employeePage - 1) * 10, employeePage * 10);

                      return displayed.map(emp => {
                        const isSelected = selectedEmpIds.includes(emp.id);
                        return (
                          <tr key={emp.id} style={{ background: isSelected ? '#F5F3FF' : undefined }}>
                            <td style={{ textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectEmp(emp.id)}
                                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                              />
                            </td>
                            <td className="mono" style={{ fontWeight: 800, color: '#4F46E5' }}>
                              {emp.empNo}
                            </td>
                            <td style={{ fontWeight: 700, color: '#0F172A' }}>
                              {emp.name}
                            </td>
                            <td style={{ fontSize: '12px' }}>
                              <div>{emp.department}</div>
                              <div style={{ fontSize: '11px', color: '#94A3B8' }}>{emp.section}</div>
                            </td>
                            <td className="mono" style={{ fontSize: '12px', fontWeight: 800, color: emp.supervisorCode ? '#D97706' : '#94A3B8' }}>
                              {emp.supervisorCode || '— Direct'}
                            </td>
                            <td style={{ fontSize: '12px', fontWeight: 600 }}>{emp.designation}</td>
                            <td className="mono" style={{ fontSize: '12px', color: '#64748B' }}>
                              {emp.phone || '—'}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                  onClick={() => {
                                    setEditingEmp(emp);
                                    setEditEmpNo(emp.empNo);
                                    setEditName(emp.name);
                                    setEditDept(emp.department);
                                    setEditSection(emp.section);
                                    setEditDesig(emp.designation);
                                    setEditPhone(emp.phone || '');
                                    setEditSupervisorCode(emp.supervisorCode || '');
                                  }}
                                  style={{
                                    padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                                    background: '#EEF2FF', color: '#4F46E5', border: '1px solid #C7D2FE', cursor: 'pointer'
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                                  style={{
                                    padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                                    background: '#FEE2E2', color: '#EF4444', border: '1px solid #FCA5A5', cursor: 'pointer'
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            )}

            {(() => {
              const filtered = employees.filter(emp => {
                if (!employeeSearch.trim()) return true;
                const q = employeeSearch.toLowerCase();
                return emp.empNo.toLowerCase().includes(q) || emp.name.toLowerCase().includes(q) || emp.department.toLowerCase().includes(q) || emp.section.toLowerCase().includes(q);
              });
              const totalPages = Math.ceil(filtered.length / 10) || 1;
              if (filtered.length === 0) return null;

              return (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', flexWrap: 'wrap', gap: '12px', background: '#F8FAFC', padding: '12px 16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>
                    Showing <span style={{ fontWeight: 800, color: '#0F172A' }}>{Math.min(filtered.length, (employeePage - 1) * 10 + 1)}–{Math.min(filtered.length, employeePage * 10)}</span> of <span style={{ fontWeight: 800, color: '#0F172A' }}>{filtered.length}</span> active employees (Strictly 10 per page)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setEmployeePage(p => Math.max(1, p - 1))}
                      disabled={employeePage === 1}
                      style={{ padding: '6px 14px', borderRadius: '8px', background: employeePage === 1 ? '#F1F5F9' : '#EEF2FF', color: employeePage === 1 ? '#94A3B8' : '#4F46E5', border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: 800, cursor: employeePage === 1 ? 'not-allowed' : 'pointer' }}
                    >
                      ◄ Prev 10
                    </button>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A', padding: '0 6px' }}>
                      Page {employeePage} of {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEmployeePage(p => Math.min(totalPages, p + 1))}
                      disabled={employeePage >= totalPages}
                      style={{ padding: '6px 14px', borderRadius: '8px', background: employeePage >= totalPages ? '#F1F5F9' : '#EEF2FF', color: employeePage >= totalPages ? '#94A3B8' : '#4F46E5', border: '1px solid #CBD5E1', fontSize: '12px', fontWeight: 800, cursor: employeePage >= totalPages ? 'not-allowed' : 'pointer' }}
                    >
                      Next 10 ►
                    </button>
                  </div>
                </div>
              );
            })()}

          </div>
        </div>
      )}

      {/* TAB 3: SECTION SUPERVISOR LOGIN & ATTENDANCE */}
      {activeTab === 'supervisor' && (
        <div className="fade-in">
          {!supervisorInfo ? (
            // Supervisor PIN Login Screen
            <div style={{ maxWidth: '420px', margin: '40px auto' }}>
              <div style={{
                background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
                borderRadius: '20px',
                padding: '36px 40px',
                textAlign: 'center',
                boxShadow: '0 20px 50px rgba(0,0,0,0.2)'
              }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '16px',
                  background: 'linear-gradient(135deg, #D97706, #F59E0B)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '28px', margin: '0 auto 16px auto',
                  boxShadow: '0 8px 20px rgba(217,119,6,0.4)'
                }}>🔐</div>
                <h2 className="outfit" style={{ fontSize: '22px', fontWeight: 800, color: '#FFFFFF', marginBottom: '6px' }}>
                  Section Supervisor Login
                </h2>
                <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '28px' }}>
                  Enter your 4-digit section PIN to access your team’s attendance sheet
                </p>

                {supervisorError && (
                  <div style={{
                    background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: '10px', padding: '10px 16px', marginBottom: '16px',
                    color: '#F87171', fontSize: '13px', fontWeight: 700
                  }}>
                    {supervisorError}
                  </div>
                )}

                <form onSubmit={handleSupervisorLogin}>
                  {/* PIN dots display */}
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '20px' }}>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} style={{
                        width: '16px', height: '16px', borderRadius: '50%',
                        background: i < supervisorPin.length ? '#F59E0B' : 'rgba(255,255,255,0.15)',
                        border: '2px solid rgba(255,255,255,0.2)',
                        transition: 'all 0.15s ease'
                      }} />
                    ))}
                  </div>

                  {/* Numeric PIN Pad */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => supervisorPin.length < 4 && setSupervisorPin(p => p + num)}
                        style={{
                          height: '56px', borderRadius: '12px',
                          background: 'rgba(255,255,255,0.08)', color: '#FFFFFF',
                          fontSize: '20px', fontWeight: 800, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer'
                        }}
                      >{num}</button>
                    ))}
                    <div />
                    <button
                      type="button"
                      onClick={() => supervisorPin.length < 4 && setSupervisorPin(p => p + '0')}
                      style={{
                        height: '56px', borderRadius: '12px',
                        background: 'rgba(255,255,255,0.08)', color: '#FFFFFF',
                        fontSize: '20px', fontWeight: 800, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer'
                      }}
                    >0</button>
                    <button
                      type="button"
                      onClick={() => setSupervisorPin(p => p.slice(0, -1))}
                      style={{
                        height: '56px', borderRadius: '12px',
                        background: 'rgba(255,255,255,0.08)', color: '#F87171',
                        fontSize: '18px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer'
                      }}
                    >⌫</button>
                  </div>

                  <button
                    type="submit"
                    disabled={supervisorPin.length < 4 || supervisorLoading}
                    style={{
                      width: '100%', padding: '13px', borderRadius: '12px',
                      background: supervisorPin.length === 4 ? 'linear-gradient(135deg, #D97706, #F59E0B)' : 'rgba(255,255,255,0.08)',
                      color: '#FFFFFF', fontSize: '14px', fontWeight: 800,
                      border: 'none', cursor: supervisorPin.length === 4 ? 'pointer' : 'not-allowed',
                      boxShadow: supervisorPin.length === 4 ? '0 4px 14px rgba(217,119,6,0.4)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {supervisorLoading ? '⏳ Verifying...' : '🔓 Unlock My Team Roster'}
                  </button>
                </form>
              </div>
            </div>
          ) : (
            // Supervisor's Team Attendance
            <div>
              {/* Supervisor Info Banner */}
              <div style={{
                background: 'linear-gradient(135deg, #D97706, #F59E0B)',
                borderRadius: '14px', padding: '16px 24px', marginBottom: '20px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                boxShadow: '0 4px 14px rgba(217,119,6,0.3)'
              }}>
                <div>
                  <h3 className="outfit" style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF' }}>
                    {supervisorInfo.name}
                  </h3>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', marginTop: '2px' }}>
                    Section: {supervisorInfo.sectionName} · Floor: {supervisorInfo.floor}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ background: 'rgba(255,255,255,0.2)', color: '#FFFFFF', fontSize: '12px', fontWeight: 800, padding: '6px 14px', borderRadius: '8px' }}>
                    {supervisorTeam.length} Team Members
                  </span>
                  <button
                    onClick={() => { setSupervisorInfo(null); setSupervisorPin(''); setSupervisorTeam([]); }}
                    style={{
                      background: 'rgba(0,0,0,0.2)', border: 'none', color: '#FFFFFF',
                      fontSize: '12px', fontWeight: 700, padding: '6px 12px', borderRadius: '8px', cursor: 'pointer'
                    }}
                  >
                    🚪 Sign Out
                  </button>
                </div>
              </div>

              {/* Team Attendance Table */}
              <div className="glass-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    📝 Today's Attendance — {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </h3>
                  
                  {/* Supervisor Search */}
                  <input
                    type="text"
                    placeholder="🔍 Search employee name or ID..."
                    value={supTeamSearch}
                    onChange={(e) => setSupTeamSearch(e.target.value)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '12px',
                      width: '220px'
                    }}
                  />

                  {selectedSupTeamEmpIds.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F8FAFC', padding: '6px 12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Mark Selected As:</span>
                      <select
                        value={supGroupStatus}
                        onChange={(e) => setSupGroupStatus(e.target.value)}
                        style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, border: '1px solid #CBD5E1', cursor: 'pointer' }}
                      >
                        <option value="present">✅ Present</option>
                        <option value="absent">❌ Absent</option>
                        <option value="late">⏰ Late</option>
                        <option value="half_day">🌓 Half Day</option>
                        <option value="leave">🏖️ On Leave</option>
                      </select>
                      <button
                        type="button"
                        onClick={handleSupGroupStatusSubmit}
                        disabled={updatingSupGroup}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 800,
                          background: updatingSupGroup ? '#94A3B8' : '#4F46E5',
                          color: '#FFFFFF',
                          border: 'none',
                          cursor: updatingSupGroup ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {updatingSupGroup ? 'Saving...' : 'Apply Status'}
                      </button>
                    </div>
                  )}
                </div>

                {supervisorTeam.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>👥</div>
                    <p style={{ fontWeight: 700, color: '#64748B' }}>No salesmen assigned to this section yet.</p>
                    <p style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>Ask the admin to assign staff with your Section Code: <strong>{supervisorInfo.sectionCode}</strong></p>
                  </div>
                ) : (
                  <div className="data-table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ width: '40px' }}>
                            <input
                              type="checkbox"
                              checked={supervisorTeam.length > 0 && supervisorTeam.every(r => selectedSupTeamEmpIds.includes(r.empId))}
                              onChange={() => toggleSelectAllSupTeam(supervisorTeam)}
                              style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                            />
                          </th>
                          <th>Emp No</th>
                          <th>Salesman Name</th>
                          <th>Status</th>
                          <th>Check-In</th>
                          <th>Check-Out</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSupTeam
                          .slice((supTeamPage - 1) * 10, supTeamPage * 10)
                          .map(r => {
                          const isSaving = savingSupEmpId === r.empId;
                          return (
                            <tr key={r.empId} style={{ background: selectedSupTeamEmpIds.includes(r.empId) ? '#EEF2FF' : 'transparent' }}>
                              <td>
                                <input
                                  type="checkbox"
                                  checked={selectedSupTeamEmpIds.includes(r.empId)}
                                  onChange={() => toggleSelectSupTeamEmp(r.empId)}
                                  style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                />
                              </td>
                              <td className="mono" style={{ fontWeight: 800, color: '#D97706' }}>{r.empNo}</td>
                              <td style={{ fontWeight: 700, color: '#0F172A' }}>{r.userName}</td>
                              <td>
                                <select
                                  value={r.status}
                                  onChange={(e) => handleSupRowChange(r.empId, 'status', e.target.value)}
                                  style={{
                                    padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700,
                                    background: STATUS_CONFIG[r.status]?.bg || '#F1F5F9',
                                    color: STATUS_CONFIG[r.status]?.color || '#475569',
                                    border: '1px solid #CBD5E1', cursor: 'pointer'
                                  }}
                                >
                                  <option value="present">✅ Present</option>
                                  <option value="absent">❌ Absent</option>
                                  <option value="late">⏰ Late</option>
                                  <option value="half_day">🌓 Half Day</option>
                                  <option value="leave">🏖️ On Leave</option>
                                </select>
                              </td>
                              <td>
                                <input type="time" value={r.checkIn || ''}
                                  onChange={(e) => handleSupRowChange(r.empId, 'checkIn', e.target.value)}
                                  style={{ padding: '6px 8px', fontSize: '12px', borderRadius: '6px', border: '1px solid #CBD5E1', width: '105px' }}
                                />
                              </td>
                              <td>
                                <input type="time" value={r.checkOut || ''}
                                  onChange={(e) => handleSupRowChange(r.empId, 'checkOut', e.target.value)}
                                  style={{ padding: '6px 8px', fontSize: '12px', borderRadius: '6px', border: '1px solid #CBD5E1', width: '105px' }}
                                />
                              </td>
                              <td>
                                  <div style={{ display: 'flex', gap: '6px' }}>
                                    <button
                                      onClick={() => handleSaveSupRow(r)}
                                      disabled={isSaving}
                                      style={{
                                        padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 700,
                                        background: '#D97706', color: '#FFFFFF', border: 'none', cursor: 'pointer'
                                      }}
                                    >
                                      {isSaving ? '...' : 'Save'}
                                    </button>
                                    <button
                                      onClick={() => setEmployeeDetail(r)}
                                      style={{
                                        padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 700,
                                        background: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1', cursor: 'pointer'
                                      }}
                                    >
                                      👁️ View
                                    </button>
                                  </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                
                {/* Pagination Controls for Supervisor Team */}
                {filteredSupTeam.length > 10 && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '20px' }}>
                    <button
                      disabled={supTeamPage === 1}
                      onClick={() => setSupTeamPage(prev => prev - 1)}
                      style={{
                        background: supTeamPage === 1 ? '#E2E8F0' : '#4F46E5', color: supTeamPage === 1 ? '#94A3B8' : '#FFFFFF',
                        padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: supTeamPage === 1 ? 'not-allowed' : 'pointer', fontWeight: 700
                      }}
                    >
                      ◀ Prev
                    </button>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>
                      Page {supTeamPage} of {Math.ceil(filteredSupTeam.length / 10)}
                    </span>
                    <button
                      disabled={supTeamPage * 10 >= filteredSupTeam.length}
                      onClick={() => setSupTeamPage(prev => prev + 1)}
                      style={{
                        background: supTeamPage * 10 >= filteredSupTeam.length ? '#E2E8F0' : '#4F46E5', color: supTeamPage * 10 >= filteredSupTeam.length ? '#94A3B8' : '#FFFFFF',
                        padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: supTeamPage * 10 >= filteredSupTeam.length ? 'not-allowed' : 'pointer', fontWeight: 700
                      }}
                    >
                      Next ▶
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Employee Detail Modal for Supervisor */}
      {employeeDetail && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
          }}
        >
          <div className="glass-card fade-in" style={{ width: '400px', maxWidth: '100%', padding: '28px', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h3 className="outfit" style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>
                  {employeeDetail.userName}
                </h3>
                <span className="badge badge-gold" style={{ fontSize: '11px' }}>{employeeDetail.empNo}</span>
              </div>
              <button onClick={() => setEmployeeDetail(null)} style={{ background: '#F1F5F9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>✕</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
                <span style={{ color: '#64748B', fontSize: '13px' }}>Department</span>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>{employeeDetail.department}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
                <span style={{ color: '#64748B', fontSize: '13px' }}>Section</span>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>{employeeDetail.section}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
                <span style={{ color: '#64748B', fontSize: '13px' }}>Designation</span>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>{employeeDetail.designation}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
                <span style={{ color: '#64748B', fontSize: '13px' }}>Mobile No</span>
                <span className="mono" style={{ fontWeight: 700, color: '#2563EB' }}>{employeeDetail.phone || 'N/A'}</span>
              </div>
            </div>

            <button 
              onClick={() => setEmployeeDetail(null)}
              style={{ width: '100%', marginTop: '24px', padding: '12px', borderRadius: '8px', background: '#0F172A', color: '#FFFFFF', fontWeight: 700, border: 'none', cursor: 'pointer' }}
            >
              Close Details
            </button>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {editingEmp && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div className="glass-card fade-in" style={{ width: '480px', maxWidth: '100%', padding: '24px', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 className="outfit" style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                ✏️ Edit Employee Details
              </h3>
              <button onClick={() => setEditingEmp(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleUpdateEmployee}>
              <div className="field-row">
                <div className="field">
                  <label>Emp No <span className="req">*</span></label>
                  <input type="text" value={editEmpNo} onChange={(e) => setEditEmpNo(e.target.value)} required />
                </div>
                <div className="field">
                  <label>Employee Name <span className="req">*</span></label>
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} required />
                </div>
              </div>

              <div className="field-row">
                <div className="field">
                  <label>Department</label>
                  <select value={editDept} onChange={(e) => setEditDept(e.target.value)}>
                    <option value="Sales">Sales</option>
                    <option value="Billing">Billing</option>
                    <option value="Greeter & Helpdesk">Greeter & Helpdesk</option>
                    <option value="Inventory / Stock">Inventory / Stock</option>
                    <option value="Management">Management</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
                <div className="field">
                  <label>Floor / Section</label>
                  <select value={editSection} onChange={(e) => setEditSection(e.target.value)}>
                    <option value="Sarees Division">Sarees Division</option>
                    <option value="Mens Suitings & Wear">Mens Suitings & Wear</option>
                    <option value="Kids and Toys Section">Kids and Toys Section</option>
                    <option value="Cash Counter 1">Cash Counter 1</option>
                    <option value="Cash Counter 2">Cash Counter 2</option>
                    <option value="Ground Floor">Ground Floor</option>
                    <option value="First Floor">First Floor</option>
                    <option value="Second Floor">Second Floor</option>
                    <option value="Godown">GODOWN</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
              </div>

              <div className="field">
                <label>Assigned Section Supervisor</label>
                <select value={editSupervisorCode} onChange={(e) => setEditSupervisorCode(e.target.value)}>
                  <option value="">-- Direct / Unassigned --</option>
                  {supervisorsList.map(sup => (
                    <option key={sup.id} value={sup.sectionCode}>
                      {sup.name} ({sup.sectionCode} — {sup.sectionName || sup.floor})
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-row">
                <div className="field">
                  <label>Designation</label>
                  <input type="text" value={editDesig} onChange={(e) => setEditDesig(e.target.value)} required />
                </div>
                <div className="field">
                  <label>Phone Number</label>
                  <input type="text" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                </div>
              </div>


              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setEditingEmp(null)}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#F1F5F9', border: '1px solid #CBD5E1', color: '#475569', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingEmp}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#4F46E5', border: 'none', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}
                >
                  {updatingEmp ? 'Saving...' : '💾 Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Group Edit Employee Modal */}
      {isGroupModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div className="glass-card fade-in" style={{ width: '520px', maxWidth: '100%', padding: '24px', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 className="outfit" style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  👥 Group Edit Employees
                </h3>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 0 0' }}>
                  Updating assignments for <strong>{selectedEmpIds.length}</strong> selected employee(s).
                </p>
              </div>
              <button onClick={() => setIsGroupModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleGroupEditSubmit}>
              <div style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: '10px', border: '1px solid #E2E8F0', marginBottom: '16px', fontSize: '12px', color: '#475569' }}>
                💡 Check the fields you wish to update across all selected employees. Unchecked fields will remain unchanged.
              </div>

              {/* Department Assignment */}
              <div style={{ padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0', marginBottom: '12px', background: groupUpdateDept ? '#FFFFFF' : '#F8FAFC' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '13px', color: '#0F172A', marginBottom: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={groupUpdateDept}
                    onChange={(e) => setGroupUpdateDept(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span>Assign Department</span>
                </label>
                {groupUpdateDept && (
                  <select
                    value={groupDept}
                    onChange={(e) => setGroupDept(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', background: '#FAF7F2' }}
                  >
                    <option value="Sales">Sales</option>
                    <option value="Billing">Billing</option>
                    <option value="Greeter & Helpdesk">Greeter & Helpdesk</option>
                    <option value="Inventory / Stock">Inventory / Stock</option>
                    <option value="Management">Management</option>
                    <option value="Others">Others</option>
                  </select>
                )}
              </div>

              {/* Section / Floor Assignment */}
              <div style={{ padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0', marginBottom: '12px', background: groupUpdateSection ? '#FFFFFF' : '#F8FAFC' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '13px', color: '#0F172A', marginBottom: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={groupUpdateSection}
                    onChange={(e) => setGroupUpdateSection(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span>Assign Floor / Section</span>
                </label>
                {groupUpdateSection && (
                  <select
                    value={groupSection}
                    onChange={(e) => setGroupSection(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', background: '#FAF7F2' }}
                  >
                    <option value="Sarees Division">Sarees Division</option>
                    <option value="Mens Suitings & Wear">Mens Suitings & Wear</option>
                    <option value="Kids and Toys Section">Kids and Toys Section</option>
                    <option value="Cash Counter 1">Cash Counter 1</option>
                    <option value="Cash Counter 2">Cash Counter 2</option>
                    <option value="Ground Floor">Ground Floor</option>
                    <option value="First Floor">First Floor</option>
                    <option value="Second Floor">Second Floor</option>
                    <option value="Godown">GODOWN</option>
                    <option value="Others">Others</option>
                  </select>
                )}
              </div>

              {/* Section Supervisor Assignment */}
              <div style={{ padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0', marginBottom: '16px', background: groupUpdateSupervisor ? '#FFFFFF' : '#F8FAFC' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '13px', color: '#0F172A', marginBottom: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={groupUpdateSupervisor}
                    onChange={(e) => setGroupUpdateSupervisor(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span>Assign Section Supervisor</span>
                </label>
                {groupUpdateSupervisor && (
                  <select
                    value={groupSupervisorCode}
                    onChange={(e) => setGroupSupervisorCode(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', background: '#FAF7F2' }}
                  >
                    <option value="">-- Direct / Unassigned --</option>
                    {supervisorsList.map(sup => (
                      <option key={sup.id} value={sup.sectionCode}>
                        {sup.name} ({sup.sectionCode} — {sup.sectionName || sup.floor})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(false)}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#F1F5F9', border: '1px solid #CBD5E1', color: '#475569', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingGroup || (!groupUpdateDept && !groupUpdateSection && !groupUpdateSupervisor)}
                  style={{
                    flex: 1, padding: '10px', borderRadius: '8px',
                    background: (!groupUpdateDept && !groupUpdateSection && !groupUpdateSupervisor) ? '#94A3B8' : '#4F46E5',
                    border: 'none', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  {updatingGroup ? 'Updating...' : `💾 Apply to ${selectedEmpIds.length} Employee(s)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
