import { useState, useRef } from 'react';
import {
  Upload, User, FileText, Plus as PlusIcon, Users, BarChart3, Download, Sparkles, Brain, Zap
} from 'lucide-react';
import logo from './assets/at.png';

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
}

const ChurnPredictionUI = () => {
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single');
  const [singlePrediction, setSinglePrediction] = useState<PredictionResponse | null>(null);
  const [batchResults, setBatchResults] = useState<PredictionResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const generateMockPrediction = (customerData: FormData): PredictionResponse => {
    const riskFactors = [
      parseInt(customerData.late_payments) > 3,
      parseInt(customerData.customer_service_calls) > 5,
      parseInt(customerData.device_age_months) > 36,
      parseFloat(customerData.monthly_charge) > 60,
      parseInt(customerData.account_length_months) < 12
    ];
    const riskScore = riskFactors.filter(Boolean).length;
    const churnProbability = 0.2 + (riskScore * 0.15) + (Math.random() * 0.2);
    const cp = Math.min(Math.max(churnProbability, 0), 1);

    let riskLevel = 'LOW', priority = 'LOW';
    if (cp > 0.7) { riskLevel = 'HIGH'; priority = 'CRITICAL'; }
    else if (cp > 0.4) { riskLevel = 'MEDIUM'; priority = 'HIGH'; }

    return {
      customer_id: customerData.customer_id,
      prediction: {
        churn_probability: parseFloat(cp.toFixed(3)),
        risk_level: riskLevel,
        confidence: riskLevel === 'HIGH' ? 'HIGH' : 'MEDIUM',
        raw_response: `{"predictions":[{"predicted_label":${cp > 0.5 ? '"1"' : '"0"'}, "probability":${cp.toFixed(3)}}]}`
      },
      business_insights: {
        recommended_action: riskLevel === 'HIGH'
          ? 'IMMEDIATE_INTERVENTION' : 'PROACTIVE_ENGAGEMENT',
        priority: priority,
        next_steps: [
          'Send targeted retention offer',
          'Analyze usage patterns',
          'Consider loyalty program enrollment',
          'Monitor for 30 days'
        ],
        estimated_revenue_risk: {
          monthly_risk_ghs: parseFloat(customerData.monthly_charge) || 50.0,
          annual_risk_ghs: (parseFloat(customerData.monthly_charge) || 50.0) * 12,
          customer_lifetime_value: (parseFloat(customerData.monthly_charge) || 50.0) * 48
        },
        intervention_timeline: riskLevel === 'HIGH' ? '1-2 days' : '3-7 days',
        success_probability: riskLevel === 'HIGH' ? 0.6 : 0.8
      },
      timestamp: new Date().toISOString(),
      model_version: 'canvas-atghana-v1',
      features_used: 14
    };
  };

  const handleSinglePrediction = async () => {
    if (!formData.customer_id) {
      alert('Please enter a customer ID');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("https://c6hpjk84dj.execute-api.us-east-1.amazonaws.com/dev/predict", {
        method: "POST",
        body: JSON.stringify({ body: formData })
      });

      if (!response.ok) {
        throw new Error("Prediction request failed");
      }

      const data: PredictionResponse = await response.json();
      console.log("Prediction response:", data);

      setSinglePrediction(data);
    } catch (error) {
      console.error("Error during prediction:", error);
      alert("There was an error making the prediction. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file?.type === 'text/csv') {
      setUploadedFile(file);
    } else {
      alert('Please upload a CSV file');
    }
  };

  const handleBatchPrediction = async () => {
    if (!uploadedFile) return alert('Please upload a CSV file first');
    setLoading(true);

    await new Promise(res => setTimeout(res, 3000));
    const mockResults: PredictionResponse[] = [];

    for (let i = 1; i <= 5; i++) {
      const mc: FormData = {
        customer_id: `CUST_${String(i).padStart(3, '0')}`,
        monthly_sms: String(Math.floor(Math.random() * 100) + 10),
        monthly_minutes: String(Math.floor(Math.random() * 300) + 50),
        monthly_data_gb: (Math.random() * 10 + 1).toFixed(2),
        monthly_charge: String(Math.floor(Math.random() * 80) + 20),
        late_payments: String(Math.floor(Math.random() * 10)),
        is_fraud: '0',
        international_calls: String(Math.floor(Math.random() * 5)),
        device_age_months: String(Math.floor(Math.random() * 60) + 6),
        customer_service_calls: String(Math.floor(Math.random() * 15)),
        contract_type: Math.random() > 0.5 ? 'monthly' : 'annual',
        city: ['Accra','Kumasi','Tamale','Cape Coast'][Math.floor(Math.random() * 4)],
        age: String(Math.floor(Math.random() * 50) + 20),
        account_length_months: String(Math.floor(Math.random() * 60) + 1)
      };
      mockResults.push(generateMockPrediction(mc));
    }

    setBatchResults(mockResults);
    setLoading(false);
  };

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
    const header = ['customer_id','churn_probability','risk_level','priority','monthly_risk_ghs'];
    const rows = batchResults.map(r => [
      r.customer_id,
      r.prediction.churn_probability,
      r.prediction.risk_level,
      r.business_insights.priority,
      r.business_insights.estimated_revenue_risk.monthly_risk_ghs
    ]);
    const csv = [header, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'churn_predictions.csv';
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
                <p className="text-slate-400 mb-6 text-lg">Upload a CSV file containing customer data for batch prediction analysis</p>
                <input type="file" accept=".csv" onChange={handleFileUpload} ref={fileInputRef} className="hidden" />
                <button onClick={()=>fileInputRef.current?.click()} className="bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-400 hover:to-red-400 text-white px-8 py-3 rounded-lg transition shadow-lg hover:shadow-xl hover:scale-105">
                  Select CSV File
                </button>
                {uploadedFile && (
                  <div className="mt-6 p-6 bg-green-500/20 border border-green-500/30 rounded-lg">
                    <p className="text-green-400 font-semibold text-lg">✓ File uploaded successfully: {uploadedFile.name}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-center">
                <button
                  onClick={handleBatchPrediction}
                  disabled={loading||!uploadedFile}
                  className="bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-400 hover:to-red-400 text-white px-12 py-4 rounded-xl font-semibold disabled:opacity-50 flex items-center space-x-3 shadow-xl hover:shadow-pink-500/40 hover:scale-105 transition"
                >
                  {loading
                    ? <>
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                        <span>Processing Batch Data...</span>
                      </>
                    : <>
                        <Users className="w-6 h-6" />
                        <span>Run Batch Analysis</span>
                        <Sparkles className="w-5 h-5" />
                      </>
                  }
                </button>
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


        {batchResults.length > 0 && (
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

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-700/50 border-b border-slate-600/50">
                    <th className="px-6 py-4 text-left font-semibold text-slate-200">Customer ID</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-200">Churn Probability</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-200">Risk Level</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-200">Priority</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-200">Monthly Risk (GHS)</th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-200">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {batchResults.map((r, idx) => (
                    <tr key={idx} className="hover:bg-slate-700/40">
                      <td className="px-6 py-4 text-slate-200">{r.customer_id}</td>
                      <td className="px-6 py-4 text-slate-200">{(r.prediction.churn_probability * 100).toFixed(1)}%</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getRiskColor(r.prediction.risk_level)}`}>{r.prediction.risk_level}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getPriorityColor(r.business_insights.priority)}`}>{r.business_insights.priority}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-200">GHS {r.business_insights.estimated_revenue_risk.monthly_risk_ghs.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <button onClick={() => alert(JSON.stringify(r, null, 2))} className="text-pink-400 hover:underline">View Details</button>
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

