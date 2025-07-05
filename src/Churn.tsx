import { useState, useRef } from 'react';
import {
  Upload, User, FileText, Plus as PlusIcon, Users, BarChart3, Download, Sparkles, Brain, Zap, AlertCircle, CheckCircle
} from 'lucide-react';
import logo from './assets/at.png';
import axios from 'axios';

interface FormData {
  customer_id: string;
  monthly_sms: string;
  monthly_minutes: string;
  monthly_data_gb: string;
  monthly_charge: string;
  late_payments: string;
  is_fraud: string;
  international_calls: string;
  device_age_months: string;
  customer_service_calls: string;
  contract_type: string;
  city: string;
  age: string;
  account_length_months: string;
}

interface PredictionResponse {
  customer_id: string;
  prediction: {
    churn_probability: number;
    risk_level: string;
    confidence: string;
    raw_response: string;
  };
  business_insights: {
    recommended_action: string;
    priority: string;
    next_steps: string[];
    estimated_revenue_risk: {
      monthly_risk_ghs: number;
      annual_risk_ghs: number;
      customer_lifetime_value: number;
    };
    intervention_timeline: string;
    success_probability: number;
  };
  timestamp: string;
  model_version: string;
  features_used: number;
  status?: string;
  error?: string;
}

interface BatchResponse {
  batch_id: string;
  summary: {
    total_customers: number;
    successful_predictions: number;
    failed_predictions: number;
    success_rate: number;
    processing_time_seconds: number;
    average_churn_probability: number;
    risk_distribution: {
      HIGH: number;
      MEDIUM: number;
      LOW: number;
      VERY_LOW: number;
      ERROR: number;
    };
    total_annual_revenue_at_risk_ghs: number;
    high_risk_customers: number;
    customers_needing_immediate_attention: number;
  };
  results: PredictionResponse[];
  timestamp: string;
  model_version: string;
}

const ChurnPredictionUI = () => {
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single');
  const [singlePrediction, setSinglePrediction] = useState<PredictionResponse | null>(null);
  const [batchResponse, setBatchResponse] = useState<BatchResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<{ [key: string]: string | number }[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Your API endpoints
  const SINGLE_PREDICTION_URL = "https://c6hpjk84dj.execute-api.us-east-1.amazonaws.com/dev/predict";
  const BATCH_PREDICTION_URL = "https://38cemfapua.execute-api.us-east-1.amazonaws.com/dev/batch-predict"; // Replace with your actual batch endpoint

  // Required CSV columns
  const REQUIRED_COLUMNS = [
    'customer_id', 'monthly_sms', 'monthly_minutes', 'monthly_data_gb',
    'monthly_charge', 'late_payments', 'is_fraud', 'international_calls',
    'device_age_months', 'customer_service_calls', 'contract_type',
    'city', 'age', 'account_length_months'
  ];

  const [formData, setFormData] = useState<FormData>({
    customer_id: "",
    monthly_sms: "",
    monthly_minutes: "",
    monthly_data_gb: "",
    monthly_charge: "",
    late_payments: "",
    is_fraud: "0",
    international_calls: "",
    device_age_months: "",
    customer_service_calls: "",
    contract_type: "monthly",
    city: "",
    age: "",
    account_length_months: ""
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const parseCSV = (csvText: string) => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) throw new Error('CSV must have at least a header and one data row');

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const rows = [];

    // Validate headers
    const missingColumns = REQUIRED_COLUMNS.filter(col => !headers.includes(col.toLowerCase()));
    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
    }

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length !== headers.length) {
        console.warn(`Row ${i + 1} has incorrect number of columns, skipping`);
        continue;
      }

      const row: { [key: string]: string | number } = {};
      headers.forEach((header, index) => {
        let value = values[index];
        
        // Clean quotes
        value = value.replace(/^["']|["']$/g, '');
        
        // Convert numeric fields
        const numericFields = [
          'monthly_sms', 'monthly_minutes', 'monthly_data_gb', 'monthly_charge',
          'late_payments', 'is_fraud', 'international_calls', 'device_age_months',
          'customer_service_calls', 'age', 'account_length_months'
        ];
        
        if (numericFields.includes(header)) {
          const numValue = parseFloat(value);
          row[header] = isNaN(numValue) ? 0 : numValue;
        } else {
          row[header] = value;
        }
      });

      rows.push(row);
    }

    return rows;
  };

  const validateCustomerData = (customers: { [key: string]: string | number }[]) => {
    const errors: string[] = [];
    
    customers.forEach((customer, index) => {
      // Validate required fields
      REQUIRED_COLUMNS.forEach(field => {
        if (customer[field] === undefined || customer[field] === null || customer[field] === '') {
          errors.push(`Row ${index + 2}: Missing ${field}`);
        }
      });

      // Validate specific field constraints
      if (
        customer.age !== undefined &&
        customer.age !== null &&
        customer.age !== '' &&
        typeof customer.age === 'number' &&
        (customer.age < 18 || customer.age > 100)
      ) {
        errors.push(`Row ${index + 2}: Age must be between 18-100`);
      }

      if (
        customer.monthly_charge !== undefined &&
        customer.monthly_charge !== null &&
        customer.monthly_charge !== '' &&
        typeof customer.monthly_charge === 'number' &&
        customer.monthly_charge < 0
      ) {
        errors.push(`Row ${index + 2}: Monthly charge cannot be negative`);
      }

      if (
        customer.is_fraud !== undefined &&
        customer.is_fraud !== null &&
        customer.is_fraud !== '' &&
        typeof customer.is_fraud === 'number' &&
        ![0, 1].includes(customer.is_fraud)
      ) {
        errors.push(`Row ${index + 2}: is_fraud must be 0 or 1`);
      }

      const validContractTypes = ['monthly', 'annual', 'prepaid', 'postpaid'];
      if (
        customer.contract_type !== undefined &&
        customer.contract_type !== null &&
        customer.contract_type !== '' &&
        typeof customer.contract_type === 'string' &&
        !validContractTypes.includes(customer.contract_type.toLowerCase())
      ) {
        errors.push(`Row ${index + 2}: contract_type must be one of: ${validContractTypes.join(', ')}`);
      }
    });

    return errors;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setUploadError('Please upload a CSV file');
      return;
    }

    setUploadedFile(file);
    setUploadError('');
    setValidationErrors([]);
    setBatchResponse(null);
    setLoading(true);

    try {
      // Read file content
      const fileContent = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
      });

      // Parse CSV
      const parsedData = parseCSV(fileContent);
      console.log('Parsed CSV data:', parsedData);

      // Validate data
      const errors = validateCustomerData(parsedData);
      if (errors.length > 0) {
        setValidationErrors(errors);
        setLoading(false);
        return;
      }

      setCsvData(parsedData);

      // Automatically send for batch prediction
      await sendBatchPrediction(parsedData);

    } catch (err: unknown) {
      console.error('Error processing CSV:', err);
      if (err instanceof Error) {
        setUploadError(err.message);
      } else {
        setUploadError('An unknown error occurred');
      }
      setLoading(false);
    }
  };

  const sendBatchPrediction = async (customers: { [key: string]: string | number }[]) => {
    try {
      console.log('Sending batch prediction for', customers.length, 'customers');

      const response = await axios.post(BATCH_PREDICTION_URL, {
        customers: customers
      });

      if (response.status !== 200) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: BatchResponse = response.data;
      console.log('Batch prediction result:', result);
      
      setBatchResponse(result);
      setLoading(false);

    } catch (err: unknown) {
      console.error('Error calling batch prediction:', err);
      if (err instanceof Error) {
        setUploadError(`Prediction failed: ${err.message}`);
      } else {
        setUploadError('Prediction failed: An unknown error occurred');
      }
      setLoading(false);
    }
  };

  const handleSinglePrediction = async () => {
    if (!formData.customer_id) {
      alert('Please enter a customer ID');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(SINGLE_PREDICTION_URL, {
        body: formData
      });

      if (response.status !== 200) {
        throw new Error("Prediction request failed");
      }

      const data: PredictionResponse = response.data;
      console.log("Prediction response:", data);

      setSinglePrediction(data);
    } catch (error) {
      console.error("Error during prediction:", error);
      alert("There was an error making the prediction. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // const handleBatchPrediction = async () => {
  //   if (!uploadedFile) return alert('Please upload a CSV file first');
    
  //   // The CSV processing and prediction happens automatically in handleFileUpload
  //   // This function is kept for the button but the actual work is done above
  //   if (csvData.length > 0) {
  //     setLoading(true);
  //     await sendBatchPrediction(csvData);
  //   }
  // };

  const getRiskColor = (level: string): string =>
    level === 'HIGH' ? 'text-red-400 bg-red-500/20 border-red-500/30' :
    level === 'MEDIUM' ? 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30' :
    'text-green-400 bg-green-500/20 border-green-500/30';

  const getPriorityColor = (priority: string): string =>
    priority === 'CRITICAL' ? 'text-red-400 bg-red-500/20 border-red-500/30' :
    priority === 'HIGH' ? 'text-orange-400 bg-orange-500/20 border-orange-500/30' :
    priority === 'MEDIUM' ? 'text-red-400 bg-red-500/20 border-red-500/30' :
    'text-green-400 bg-green-500/20 border-green-500/30';

  const exportCSV = () => {
    if (!batchResponse?.results) return;

    const header = [
      'customer_id', 'churn_probability', 'risk_level', 'confidence', 
      'recommended_action', 'priority', 'monthly_risk_ghs', 'annual_risk_ghs',
      'intervention_timeline', 'success_probability', 'status'
    ];

    const rows = batchResponse.results.map(r => [
      r.customer_id,
      r.prediction?.churn_probability || 'N/A',
      r.prediction?.risk_level || 'ERROR',
      r.prediction?.confidence || 'LOW',
      r.business_insights?.recommended_action || 'MANUAL_REVIEW',
      r.business_insights?.priority || 'HIGH',
      r.business_insights?.estimated_revenue_risk?.monthly_risk_ghs || 0,
      r.business_insights?.estimated_revenue_risk?.annual_risk_ghs || 0,
      r.business_insights?.intervention_timeline || 'ASAP',
      r.business_insights?.success_probability || 0,
      r.status || 'ERROR'
    ]);

    const csv = [header, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `churn_predictions_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-gray-900 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-10 opacity-50">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-red-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" />
          <div className="absolute top-3/4 right-1/4 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000" />
          <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-4000" />
        </div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center items-center gap-2 mb-6">
            <div className="relative">
              <div className="bg-gradient-to-r from-pink-500 via-red-500 to-pink-500 p-1 rounded-full">
                <div className="bg-slate-900 p-4 rounded-full"><Brain className="w-12 h-12 text-white" /></div>
              </div>
            </div>
            <div>
              <PlusIcon className="w-12 h-12 text-white"/>
            </div>
            <div>
              <img src={logo} className='h-auto w-23'/>
            </div>
          </div>
          <h1 className="text-6xl font-bold bg-gradient-to-r from-pink-400 via-red-400 to-pink-400 bg-clip-text text-transparent mb-4">
            AI Churn Prediction
          </h1>
          <p className="text-slate-300 text-xl max-w-2xl mx-auto leading-relaxed">
            Harness the power of artificial intelligence to identify at-risk customers and optimize retention strategies with precision
          </p>
          <div className="flex justify-center items-center space-x-2 mt-4">
            <Zap className="w-5 h-5 text-red-400" />
            <span className="text-slate-400 text-sm">Powered by Advanced ML Algorithms</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="backdrop-blur-xl bg-slate-800/50 border border-slate-700/50 rounded-2xl shadow-2xl p-8 mb-8">
          <div className="flex space-x-2 bg-slate-900/50 p-2 rounded-xl mb-8 border border-slate-700/30">
            <button onClick={() => setActiveTab('single')} className={`flex items-center space-x-3 px-8 py-4 rounded-lg font-medium transition-all ${activeTab==='single'?'bg-gradient-to-r from-pink-500 to-red-500 text-white shadow-lg':'text-slate-300 hover:text-white hover:bg-slate-700/50'}`}>
              <User className="w-5 h-5" /><span>Single Prediction</span>
            </button>
            <button onClick={() => setActiveTab('batch')} className={`flex items-center space-x-3 px-8 py-4 rounded-lg font-medium transition-all ${activeTab==='batch'?'bg-gradient-to-r from-pink-500 to-red-500 text-white shadow-lg':'text-slate-300 hover:text-white hover:bg-slate-700/50'}`}>
              <FileText className="w-5 h-5" /><span>Batch Prediction</span>
            </button>
          </div>

          {/* Single */}
          {activeTab==='single' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { name: 'customer_id', label: 'Customer ID *', type: 'text', placeholder: 'e.g., CUST_001' },
                  { name: 'monthly_sms', label: 'Monthly SMS', type: 'number', placeholder: '20' },
                  { name: 'monthly_minutes', label: 'Monthly Minutes', type: 'number', placeholder: '150' },
                  { name: 'monthly_data_gb', label: 'Monthly Data (GB)', type: 'number', step: '0.1', placeholder: '2.5' },
                  { name: 'monthly_charge', label: 'Monthly Charge (GHS)', type: 'number', placeholder: '45' },
                  { name: 'late_payments', label: 'Late Payments', type: 'number', placeholder: '5' },
                  { name: 'international_calls', label: 'International Calls', type: 'number', placeholder: '0' },
                  { name: 'device_age_months', label: 'Device Age (Months)', type: 'number', placeholder: '48' },
                  { name: 'customer_service_calls', label: 'Customer Service Calls', type: 'number', placeholder: '8' },
                  { name: 'city', label: 'City', type: 'text', placeholder: 'Accra' },
                  { name: 'age', label: 'Age', type: 'number', placeholder: '52' },
                  { name: 'account_length_months', label: 'Account Length (Months)', type: 'number', placeholder: '8' }
                ].map(fld=>(
                  <div key={fld.name} className="group">
                    <label className="block text-sm font-medium text-slate-300 mb-3 transition-colors group-hover:text-white">
                      {fld.label}
                    </label>
                    <input
                      type={fld.type}
                      step={fld.step}
                      name={fld.name}
                      value={formData[fld.name as keyof FormData]}
                      onChange={handleInputChange}
                      placeholder={fld.placeholder}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg focus:ring-2 focus:ring-pink-500 text-white placeholder-slate-400 hover:bg-slate-700/70 transition"
                    />
                  </div>
                ))}
                <div className="group">
                  <label className="block text-sm font-medium text-slate-300 mb-3 transition-colors group-hover:text-white">Fraud History</label>
                  <select
                    name="is_fraud"
                    value={formData.is_fraud}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg focus:ring-2 focus:ring-pink-500 text-white hover:bg-slate-700/70 transition"
                  >
                    <option value="0">No</option>
                    <option value="1">Yes</option>
                  </select>
                </div>
                <div className="group">
                  <label className="block text-sm font-medium text-slate-300 mb-3 transition-colors group-hover:text-white">Contract Type</label>
                  <select
                    name="contract_type"
                    value={formData.contract_type}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg focus:ring-2 focus:ring-pink-500 text-white hover:bg-slate-700/70 transition"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual</option>
                    <option value="prepaid">Prepaid</option>
                    <option value="postpaid">Postpaid</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-center pt-6">
                <button
                  onClick={handleSinglePrediction}
                  disabled={loading}
                  className="bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-400 hover:to-red-400 text-white px-12 py-4 rounded-xl font-semibold disabled:opacity-50 flex items-center space-x-3 shadow-xl hover:shadow-pink-500/40 hover:scale-105 transition"
                >
                  {loading
                    ? <>
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                        <span>Analyzing Customer Data...</span>
                      </>
                    : <>
                        <BarChart3 className="w-6 h-6" />
                        <span>Predict Churn Risk</span>
                        <Sparkles className="w-5 h-5" />
                      </>
                  }
                </button>
              </div>
            </div>
          )}

          {/* Batch */}
          {activeTab==='batch' && (
            <div className="space-y-8">
              <div className="border-2 border-dashed border-slate-600/50 rounded-xl p-12 text-center bg-slate-700/20 hover:bg-slate-700/30 transition">
                <Upload className="w-16 h-16 text-slate-400 mx-auto mb-6" />
                <h3 className="text-2xl font-semibold text-slate-200 mb-3">Upload CSV File</h3>
                <p className="text-slate-400 mb-2 text-lg">Upload a CSV file containing customer data for automatic batch prediction</p>
                <p className="text-slate-500 mb-6 text-sm">
                  Required columns: customer_id, monthly_sms, monthly_minutes, monthly_data_gb, monthly_charge, 
                  late_payments, is_fraud, international_calls, device_age_months, customer_service_calls, 
                  contract_type, city, age, account_length_months
                </p>
                <input type="file" accept=".csv" onChange={handleFileUpload} ref={fileInputRef} className="hidden" />
                <button 
                  onClick={()=>fileInputRef.current?.click()} 
                  disabled={loading}
                  className="bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-400 hover:to-red-400 text-white px-8 py-3 rounded-lg transition shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Select CSV File'}
                </button>
                
                {uploadedFile && !loading && (
                  <div className="mt-6 p-6 bg-green-500/20 border border-green-500/30 rounded-lg">
                    <div className="flex items-center justify-center space-x-2">
                      <CheckCircle className="w-6 h-6 text-green-400" />
                      <p className="text-green-400 font-semibold text-lg">
                        ✓ File uploaded and processed: {uploadedFile.name}
                      </p>
                    </div>
                    <p className="text-green-300 text-sm mt-2">
                      {csvData.length} customers parsed successfully
                    </p>
                  </div>
                )}

                {loading && (
                  <div className="mt-6 p-6 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
                      <p className="text-blue-400 font-semibold">Processing CSV and running batch prediction...</p>
                    </div>
                  </div>
                )}

                {uploadError && (
                  <div className="mt-6 p-6 bg-red-500/20 border border-red-500/30 rounded-lg">
                    <div className="flex items-center justify-center space-x-2">
                      <AlertCircle className="w-6 h-6 text-red-400" />
                      <p className="text-red-400 font-semibold">{uploadError}</p>
                    </div>
                  </div>
                )}

                {validationErrors.length > 0 && (
                  <div className="mt-6 p-6 bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-left">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertCircle className="w-5 h-5 text-yellow-400" />
                      <h4 className="font-semibold text-yellow-400">Validation Errors Found</h4>
                    </div>
                    <ul className="text-yellow-300 text-sm space-y-1 max-h-40 overflow-y-auto">
                      {validationErrors.slice(0, 10).map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                      {validationErrors.length > 10 && (
                        <li className="text-yellow-400 font-medium">
                          ... and {validationErrors.length - 10} more errors
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Results Sections */}
        {singlePrediction && (
          <div className="mt-12 p-6 rounded-xl bg-slate-900/70 border border-pink-600/30 text-white space-y-6">
            <h2 className="text-3xl font-bold text-red-400 mb-4">Prediction Result</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-lg">
              <div><strong>Customer ID:</strong> {singlePrediction.customer_id}</div>
              <div><strong>Churn Probability:</strong> {(singlePrediction.prediction.churn_probability * 100).toFixed(1)}%</div>
              <div><strong>Risk Level:</strong> <span className={`px-2 py-1 rounded text-sm border ${getRiskColor(singlePrediction.prediction.risk_level)}`}>{singlePrediction.prediction.risk_level}</span></div>
              <div><strong>Confidence:</strong> {singlePrediction.prediction.confidence}</div>
              <div><strong>Recommended Action:</strong> {singlePrediction.business_insights.recommended_action.replaceAll('_', ' ')}</div>
              <div><strong>Priority:</strong> <span className={`px-2 py-1 rounded text-sm border ${getPriorityColor(singlePrediction.business_insights.priority)}`}>{singlePrediction.business_insights.priority}</span></div>
              <div><strong>Revenue at Risk (Monthly):</strong> GHS {singlePrediction.business_insights.estimated_revenue_risk.monthly_risk_ghs}</div>
              <div><strong>Revenue at Risk (Annual):</strong> GHS {singlePrediction.business_insights.estimated_revenue_risk.annual_risk_ghs}</div>
              <div><strong>Customer Lifetime Value:</strong> GHS {singlePrediction.business_insights.estimated_revenue_risk.customer_lifetime_value}</div>
              <div><strong>Intervention Timeline:</strong> {singlePrediction.business_insights.intervention_timeline}</div>
              <div><strong>Success Probability:</strong> {(singlePrediction.business_insights.success_probability * 100).toFixed(0)}%</div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-pink-400 mb-2">Next Steps</h3>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                {singlePrediction.business_insights.next_steps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ul>
            </div>

            <div className="text-sm text-slate-400">
              <div>Model Version: {singlePrediction.model_version}</div>
              <div>Timestamp: {new Date(singlePrediction.timestamp).toLocaleString()}</div>
              <div>Features Used: {singlePrediction.features_used}</div>
            </div>
          </div>
        )}

        {batchResponse && (
          <div className="backdrop-blur-xl bg-slate-800/50 border border-slate-700/50 rounded-2xl shadow-2xl p-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-white">Batch Analysis Results</h2>
              <button
                onClick={exportCSV}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white px-6 py-3 rounded-lg flex items-center space-x-2 shadow-lg hover:shadow-xl hover:scale-105 transition"
              >
                <Download className="w-5 h-5" /><span>Export Results</span>
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600/50">
                <div className="flex items-center space-x-2 mb-2">
                  <Users className="h-5 w-5 text-blue-400" />
                  <span className="text-sm font-medium text-slate-300">Total Customers</span>
                </div>
                <p className="text-2xl font-bold text-white">{batchResponse.summary.total_customers}</p>
              </div>

              <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600/50">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-sm font-medium text-slate-300">Success Rate</span>
                </div>
                <p className="text-2xl font-bold text-white">{batchResponse.summary.success_rate}%</p>
              </div>

              <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600/50">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <span className="text-sm font-medium text-slate-300">High Risk</span>
                </div>
                <p className="text-2xl font-bold text-white">{batchResponse.summary.high_risk_customers}</p>
              </div>

              <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600/50">
                <div className="flex items-center space-x-2 mb-2">
                  <BarChart3 className="h-5 w-5 text-orange-400" />
                  <span className="text-sm font-medium text-slate-300">Revenue at Risk</span>
                </div>
                <p className="text-2xl font-bold text-white">
                  ₵{batchResponse.summary.total_annual_revenue_at_risk_ghs?.toLocaleString() || 0}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-700/50 border-b border-slate-600/50">
                    <th className="px-6 py-4 text-left font-semibold text-slate-200">Customer ID</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-200">Churn Probability</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-200">Risk Level</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-200">Priority</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-200">Monthly Risk (GHS)</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-200">Status</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-200">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {batchResponse.results.map((r, idx) => (
                    <tr key={idx} className="hover:bg-slate-700/40">
                      <td className="px-6 py-4 text-slate-200">{r.customer_id}</td>
                      <td className="px-6 py-4 text-slate-200">
                        {r.prediction?.churn_probability ? `${(r.prediction.churn_probability * 100).toFixed(1)}%` : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getRiskColor(r.prediction?.risk_level || 'ERROR')}`}>
                          {r.prediction?.risk_level || 'ERROR'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getPriorityColor(r.business_insights?.priority || 'HIGH')}`}>
                          {r.business_insights?.priority || 'HIGH'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-200">
                        GHS {r.business_insights?.estimated_revenue_risk?.monthly_risk_ghs?.toFixed(2) || 0}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          r.status === 'SUCCESS' 
                            ? 'text-green-400 bg-green-500/20 border-green-500/30' 
                            : 'text-red-400 bg-red-500/20 border-red-500/30'
                        }`}>
                          {r.status || 'ERROR'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => alert(JSON.stringify(r, null, 2))} 
                          className="text-pink-400 hover:underline"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChurnPredictionUI;