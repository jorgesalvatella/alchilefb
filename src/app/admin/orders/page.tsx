import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const orders = [
    { id: 'ORD001', customer: 'John Doe', date: '2024-07-21', total: '$25.50', status: 'Entregado' },
    { id: 'ORD002', customer: 'Jane Smith', date: '2024-07-21', total: '$15.00', status: 'Preparando' },
    { id: 'ORD003', customer: 'Bob Johnson', date: '2024-07-20', total: '$42.10', status: 'Entregado' },
];

export default function AdminOrdersPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Pedidos Recientes</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID Pedido</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Estado</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {orders.map(order => (
                            <TableRow key={order.id}>
                                <TableCell className="font-medium">{order.id}</TableCell>
                                <TableCell>{order.customer}</TableCell>
                                <TableCell>{order.date}</TableCell>
                                <TableCell>{order.total}</TableCell>
                                <TableCell>
                                    <Badge variant={order.status === 'Entregado' ? 'default' : 'secondary'}>{order.status}</Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
