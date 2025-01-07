import { useState, useEffect } from "react";
import { Button, Table, Tag, Popconfirm, message, TableColumnsType, Card, Row, Col } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

type Report = {
  id: number;
  program: { name: string };
  recipientCount: number;
  distributionDate: string;
  region: string;
  proof: string;
  status: string;
};

const DashboardAdmin = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [statistics, setStatistics] = useState({
    totalReports: 0,
    recipientPerProgram: {} as { [key: string]: number },
    distributionPerRegion: {} as { [key: string]: number },
  });

  useEffect(() => {
    async function fetchReports() {
      'use server';
      try {
        const response = await fetch("/api/reports");
        const data = await response.json();
        if (Array.isArray(data)) {
          setReports(data);
          calculateStatistics(data);
        } else {
          console.error("Data laporan tidak valid:", data);
          message.error("Gagal memuat data laporan.");
        }
      } catch (error) {
        console.error("Kesalahan saat mengambil laporan:", error);
        message.error("Gagal memuat data laporan.");
      }
    }
    fetchReports();
  }, []);

  const calculateStatistics = (data: Report[]) => {
    let totalReports = 0;
    const recipientPerProgram: { [key: string]: number } = {};
    const distributionPerRegion: { [key: string]: number } = {};

    data.forEach((report) => {
      totalReports++;
      recipientPerProgram[report.program.name] = (recipientPerProgram[report.program.name] || 0) + report.recipientCount;
      distributionPerRegion[report.region] = (distributionPerRegion[report.region] || 0) + report.recipientCount;
    });

    setStatistics({
      totalReports,
      recipientPerProgram,
      distributionPerRegion,
    });
  };

  const handleApproval = async (id: number, status: string, reason = "") => {
    try {
      const response = await fetch(`/api/reports/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status, note: reason }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Gagal memperbarui laporan.");
      }

      setReports((prevReports) =>
        prevReports.map((report) =>
          report.id === id ? { ...report, status } : report
        )
      );

      message.success(`Laporan ${status === "Disetujui" ? "disetujui" : "ditolak"}`);
    } catch (error) {
      console.error("Kesalahan saat memperbarui laporan:", error);
      message.error(`Terjadi kesalahan: ${error instanceof Error ? error.message : "Tidak diketahui"}`);
    }
  };

  const columns: TableColumnsType<Report> = [
    {
      title: "Nama Program",
      dataIndex: "program",
      align: "center",
      render: (program: { name: string } | undefined) => program?.name || "Tidak tersedia",
    },
    {
      title: "Wilayah",
      align: "center",
      dataIndex: "region",
    },
    {
      title: "Jumlah Penerima",
      align: "center",
      dataIndex: "recipientCount",
    },
    {
      title: "Tanggal Penyaluran",
      align: "center",
      dataIndex: "distributionDate",
      render: (date: string | undefined) =>
        date ? new Date(date).toLocaleDateString() : "Tidak tersedia",
    },
    {
      title: "Bukti",
      align: "center",
      dataIndex: "proof",
      render: (proof: string | undefined) =>
        proof ? (
          <a href={proof} target="_blank" rel="noopener noreferrer" className="text-blue-500">
            Download
          </a>
        ) : (
          "Tidak tersedia"
        ),
    },
    {
      title: "Status",
      align: "center",
      dataIndex: "status",
      render: (status: string | undefined) => {
        let color = "default";
        if (status === "Disetujui") color = "success";
        if (status === "Ditolak") color = "error";
        return <Tag color={color}>{status || "Tidak tersedia"}</Tag>;
      },
    },
    {
      title: "Aksi",
      align: "center",
      dataIndex: "action",
      render: (_: unknown, record: Report) => (
        <div className="flex space-x-2">
          {record.status === "Pending" && (
            <>
              <Popconfirm
                title="Apakah Anda yakin ingin menyetujui laporan ini?"
                onConfirm={() => handleApproval(record.id, "Disetujui")}
                okText="Ya"
                cancelText="Tidak"
              >
                <Button type="primary" icon={<CheckCircleOutlined />} size="small">
                  Setujui
                </Button>
              </Popconfirm>
              <Popconfirm
                title="Alasan penolakan?"
                onConfirm={() => {
                  const reason = prompt("Alasan penolakan:");
                  if (reason) handleApproval(record.id, "Ditolak", reason);
                }}
                okText="Ya"
                cancelText="Tidak"
              >
                <Button type="primary" danger icon={<CloseCircleOutlined />} size="small">
                  Tolak
                </Button>
              </Popconfirm>
            </>
          )}
        </div>
      ),
    },
  ];

  const regionChartData = Object.entries(statistics.distributionPerRegion).map(([region, count]) => ({
    region,
    count,
  }));

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-6 bg-white shadow-lg rounded-lg w-full max-w-4xl my-4">

        {/* Panel Verifikasi Laporan Section */}
        <Card title="Panel Verifikasi Laporan" bordered={false}>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={reports}
            pagination={false}
            bordered
          />
        </Card>

        {/* Dashboard Monitoring Section */}
        <Card title="Dashboard Monitoring" bordered={false} className="mt-6">
          <Row gutter={16}>
            <Col span={12}>
              <Card title="Total Laporan" bordered={false}>
                <p>{statistics.totalReports}</p>
              </Card>
            </Col>
            <Col span={12}>
              <Card title="Penerima per Program" bordered={false}>
                {Object.entries(statistics.recipientPerProgram).map(([program, count]) => (
                  <p key={program}>
                    {program}: {count} Penerima
                  </p>
                ))}
              </Card>
            </Col>
            <Col span={24} className="mt-4">
              <Card title="Penyaluran per Wilayah" bordered={false}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={regionChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="region" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>
        </Card>
      </div>
    </div>
  );
};

export default DashboardAdmin;
