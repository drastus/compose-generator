import {useState} from 'react';
import type {NameEntry} from './names'

function formatCodePoint(cp: number): string {
    return 'U+' + cp.toString(16).toUpperCase().padStart(4, '0')
}

function codePointChar(cp: number): string {
    try {
        return String.fromCodePoint(cp)
    } catch {
        return ''
    }
}

function buildName(entry: NameEntry): string {
    if (entry.name) return entry.name;
    let nameParts = [];
    (entry.template ?? []).forEach((part, i) => {
        if (i === 2) nameParts.push('WITH');
        else if (i > 2) nameParts.push('AND');
        nameParts.push(part);
    });
    if (entry.end) nameParts.push(entry.end);
    return nameParts.join(' ');
}

export default function Table({entries}: {entries: NameEntry[]}) {
    const [isExpanded, setIsExpanded] = useState(false);

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    return (
        <div className="table-wrapper">
            <div
                className="table-header"
                onClick={toggleExpand}
            >
                <span style={{transition: 'transform 0.2s', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)'}}>
                    ▶
                </span>
                <span>{entries.length} character{entries.length !== 1 ? 's' : ''}</span>
            </div>
            {isExpanded && (
                <table>
                    <thead>
                        <tr>
                            <th>Code point</th>
                            <th>Char</th>
                            <th>Name</th>
                        </tr>
                    </thead>
                    <tbody>
                        {entries.map((e) => (
                            <tr key={e.cp}>
                                <td className="mono">{formatCodePoint(e.cp)}</td>
                                <td className="char">{codePointChar(e.cp)}</td>
                                <td>{buildName(e)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    )
}
