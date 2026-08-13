export function exportToCSV<T extends Record<string, any>>(data: T[], filename: string, headers?: string[]) {
    if (data.length === 0) {
        alert('No data to export');
        return;
    }
    const firstRow = data[0];
    if (firstRow === undefined) return;
    const csvHeaders = headers || Object.keys(firstRow);
    const csvContent = [
        csvHeaders.join(','),
        ...data.map((row) => csvHeaders
            .map((header) => {
            const value = row[header];
            if (value === null || value === undefined)
                return '';
            if (typeof value === 'object')
                return JSON.stringify(value);
            const stringValue = String(value).replace(/"/g, '""');
            return `"${stringValue}"`;
        })
            .join(',')),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
export function exportTableToCSV(tableElement: HTMLTableElement, filename: string) {
    const rows: string[] = [];
    const headerCells = tableElement.querySelectorAll('thead th');
    const headers = Array.from(headerCells).map((cell) => cell.textContent?.trim() || '');
    rows.push(headers.join(','));
    const dataRows = tableElement.querySelectorAll('tbody tr');
    dataRows.forEach((row) => {
        const cells = row.querySelectorAll('td');
        const values = Array.from(cells).map((cell) => {
            const text = cell.textContent?.trim() || '';
            return `"${text.replace(/"/g, '""')}"`;
        });
        rows.push(values.join(','));
    });
    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
