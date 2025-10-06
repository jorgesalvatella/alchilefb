import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const customers = [
    { id: 'CUST001', name: 'John Doe', email: 'john.d@example.com', totalSpent: '$255.50' },
    { id: 'CUST002', name: 'Jane Smith', email: 'jane.s@example.com', totalSpent: '$150.00' },
    { id: 'CUST003', name: 'Bob Johnson', email: 'bob.j@example.com', totalSpent: '$420.10' },
];

export default function AdminCustomersPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Clientes</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Correo Electrónico</TableHead>
                            <TableHead>Total Gastado</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {customers.map(customer => (
                            <TableRow key={customer.id}>
                                <TableCell className="flex items-center gap-2">
                                    <Avatar>
                                        <AvatarFallback>{customer.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium">{customer.name}</span>
                                </TableCell>
                                <TableCell>{customer.email}</TableCell>
                                <TableCell>{customer.totalSpent}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
