import React from 'react';
import { ExecutiveMember } from '@/services/aboutService';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, Phone, MapPin, User } from 'lucide-react';

interface OrganizationalChartProps {
  executives: ExecutiveMember[];
}

interface OrgNode {
  member: ExecutiveMember;
  children: OrgNode[];
  level: number;
}

// Custom styled node component
function OrgNodeCard({ member, isTopLevel }: { member: ExecutiveMember; isTopLevel?: boolean }) {
  return (
    <Card className={`${isTopLevel ? 'w-72' : 'w-64'} hover:shadow-xl transition-all duration-200 border-2 border-primary/30 bg-white shadow-md`}>
      <CardContent className="p-4">
        <div className="flex flex-col items-center text-center">
          {/* Profile Image */}
          <div className="mb-3">
            {member.profileImage ? (
              <img
                src={member.profileImage}
                alt={member.name}
                className={`${isTopLevel ? 'w-20 h-20' : 'w-16 h-16'} rounded-full object-cover border-4 border-primary/20 shadow-sm`}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className={`${isTopLevel ? 'w-20 h-20' : 'w-16 h-16'} rounded-full bg-gradient-to-br from-primary/10 to-primary/5 border-4 border-primary/20 flex items-center justify-center ${member.profileImage ? 'hidden' : ''}`}
            >
              <User className={`${isTopLevel ? 'w-10 h-10' : 'w-8 h-8'} text-primary/40`} />
            </div>
          </div>

          {/* Name and Position */}
          <h3 className={`font-bold ${isTopLevel ? 'text-base' : 'text-sm'} mb-1 text-gray-900`}>
            {member.name}
          </h3>
          <p className={`${isTopLevel ? 'text-sm' : 'text-xs'} font-semibold text-primary mb-2`}>
            {member.position}
          </p>

          {/* Department/Region Badge */}
          {(member.department || member.region !== 'national') && (
            <div className="flex gap-1.5 mb-2 flex-wrap justify-center">
              {member.department && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                  {member.department}
                </span>
              )}
              {member.region !== 'national' && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full capitalize">
                  <MapPin className="w-3 h-3 mr-0.5" />
                  {member.region}
                </span>
              )}
            </div>
          )}

          {/* Contact Info */}
          {(member.email || member.phone) && (
            <div className="w-full pt-2 border-t border-gray-100 space-y-1 text-xs text-gray-600">
              {member.email && (
                <div className="flex items-center justify-center gap-1">
                  <Mail className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{member.email}</span>
                </div>
              )}
              {member.phone && (
                <div className="flex items-center justify-center gap-1">
                  <Phone className="w-3 h-3 flex-shrink-0" />
                  <span>{member.phone}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Build hierarchical tree structure from flat array
function buildHierarchy(executives: ExecutiveMember[]): OrgNode | null {
  // Find root (person with no reportsTo or hierarchyLevel = 0)
  const root = executives.find(e => !e.reportsTo || (e.hierarchyLevel !== undefined && e.hierarchyLevel === 0));

  if (!root) {
    // If no clear root, use the first person sorted by hierarchyLevel and displayOrder
    const sorted = [...executives].sort((a, b) => {
      const aLevel = a.hierarchyLevel || 0;
      const bLevel = b.hierarchyLevel || 0;
      if (aLevel !== bLevel) {
        return aLevel - bLevel;
      }
      return a.displayOrder - b.displayOrder;
    });

    if (sorted.length === 0) return null;

    return buildNode(sorted[0], executives, 0);
  }

  return buildNode(root, executives, 0);
}

function buildNode(member: ExecutiveMember, allMembers: ExecutiveMember[], level: number): OrgNode {
  // Find all direct reports
  const directReports = allMembers
    .filter(e => e.reportsTo === member._id)
    .sort((a, b) => {
      // Sort by hierarchyLevel first, then displayOrder
      const aLevel = a.hierarchyLevel || 0;
      const bLevel = b.hierarchyLevel || 0;
      if (aLevel !== bLevel) {
        return aLevel - bLevel;
      }
      return a.displayOrder - b.displayOrder;
    });

  return {
    member,
    level,
    children: directReports.map(report => buildNode(report, allMembers, level + 1))
  };
}

// Render a node and its children with custom layout
function renderNode(node: OrgNode): React.ReactElement {
  const hasChildren = node.children.length > 0;
  const isTopLevel = node.level === 0;

  return (
    <div className="flex flex-col items-center">
      {/* The node card */}
      <div className="mb-6">
        <OrgNodeCard member={node.member} isTopLevel={isTopLevel} />
      </div>

      {/* Vertical connector line */}
      {hasChildren && (
        <div className="w-0.5 h-8 bg-gradient-to-b from-primary/40 to-primary/20"></div>
      )}

      {/* Children container */}
      {hasChildren && (
        <div className="flex flex-col items-center">
          {/* Horizontal line across all children */}
          <div className="relative w-full mb-8">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/20"></div>

            {/* Grid of children */}
            <div className={`grid ${node.children.length === 1 ? 'grid-cols-1' : node.children.length === 2 ? 'grid-cols-2' : node.children.length === 3 ? 'grid-cols-3' : 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'} gap-x-8 gap-y-12 mt-8`}>
              {node.children.map((child, index) => (
                <div key={child.member._id || index} className="relative">
                  {/* Vertical connector from horizontal line to child */}
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 w-0.5 h-8 bg-gradient-to-b from-primary/20 to-primary/40"></div>
                  {renderNode(child)}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function OrganizationalChart({ executives }: OrganizationalChartProps) {
  // Build hierarchy
  const hierarchyRoot = buildHierarchy(executives);

  // Debug: Check if any members have reportsTo set
  const membersWithReportsTo = executives.filter(e => e.reportsTo);

  if (!hierarchyRoot) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="bg-gray-100 border border-gray-200 rounded-lg p-8 max-w-2xl mx-auto">
          <p className="text-lg">No organizational structure data available</p>
        </div>
      </div>
    );
  }

  // If no hierarchy is set up yet, show a message
  if (membersWithReportsTo.length === 0 && executives.length > 1) {
    return (
      <div className="text-center py-12">
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-8 max-w-2xl mx-auto shadow-sm">
          <h3 className="text-xl font-bold text-yellow-800 mb-3">Organizational Hierarchy Not Set Up</h3>
          <p className="text-yellow-700 mb-4 text-base">
            The organizational chart requires hierarchy relationships to be configured.
            Please go to the Executive Members Management page and set the "Reports To" field for each member.
          </p>
          <div className="text-sm text-yellow-600 bg-yellow-100/50 rounded p-4">
            <strong className="block mb-2">Current members ({executives.length}):</strong>
            <ul className="list-disc list-inside space-y-1 text-left max-w-md mx-auto">
              {executives.slice(0, 5).map(e => (
                <li key={e._id}>{e.name} - {e.position}</li>
              ))}
              {executives.length > 5 && <li>... and {executives.length - 5} more</li>}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto py-12 bg-gradient-to-b from-gray-50 to-white">
      <div className="flex justify-center min-w-fit px-8">
        <div className="max-w-[1600px]">
          {renderNode(hierarchyRoot)}
        </div>
      </div>
    </div>
  );
}
