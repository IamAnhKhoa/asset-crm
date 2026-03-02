export function formatDateTime(d: Date | string): string {
    const date = d instanceof Date ? d : new Date(d);
    const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false
    };
    const parts = new Intl.DateTimeFormat('en-GB', options).formatToParts(date);
    const p: Record<string, string> = {};
    parts.forEach(({ type, value }) => { p[type] = value; });

    // In some environments, hour might be formatted as 24:xx instead of 00:xx
    let hh = p.hour;
    if (hh === '24') hh = '00';

    return `${p.day}/${p.month}/${p.year} ${hh}:${p.minute}`;
}

export function formatDate(d: Date | string): string {
    const date = d instanceof Date ? d : new Date(d);
    const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit', month: '2-digit', year: 'numeric'
    };
    const parts = new Intl.DateTimeFormat('en-GB', options).formatToParts(date);
    const p: Record<string, string> = {};
    parts.forEach(({ type, value }) => { p[type] = value; });
    return `${p.day}/${p.month}/${p.year}`;
}

export function parseViDate(str: string): Date | null {
    if (!str) return null;
    // dd/mm/yyyy hh:mm or dd/mm/yyyy
    const parts = str.split(' ');
    const dateParts = parts[0].split('/');
    if (dateParts.length !== 3) return null;
    const [dd, mm, yyyy] = dateParts;
    const timeParts = parts[1] ? parts[1].split(':') : ['0', '0'];
    return new Date(
        parseInt(yyyy), parseInt(mm) - 1, parseInt(dd),
        parseInt(timeParts[0]), parseInt(timeParts[1])
    );
}
