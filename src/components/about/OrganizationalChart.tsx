import React from 'react';
import { Tree, TreeNode } from 'react-organizational-chart';
import { ExecutiveMember } from '@/services/aboutService';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, Phone, MapPin } from 'lucide-react';

interface OrganizationalChartProps {
  executives: ExecutiveMember[];
}

interface OrgNode {
  member: ExecutiveMember;
  children: OrgNode[];
}

// Custom styled node component
function OrgNodeCard({ member }: { member: ExecutiveMember }) {
  return (
    <Card className="w-64 hover:shadow-lg transition-shadow border-2 border-primary/20">
      <CardContent className="p-4">
        <div className="flex flex-col items-center text-center">
          {/* Profile Image */}
          <div className="mb-3">
            <img
              src={member.profileImage}
              alt={member.name}
              className="w-20 h-20 rounded-full object-cover border-4 border-primary/10"
            />
          </div>

          {/* Name and Position */}
          <h3 className="font-bold text-base mb-1">{member.name}</h3>
          <p className="text-sm font-medium text-primary mb-2">
            {member.position}
          </p>

          {/* Department/Region Badge */}
          {(member.department || member.region !== 'national') && (
            <div className="flex gap-1 mb-3 flex-wrap justify-center">
              {member.department && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                  {member.department}
                </span>
              )}
              {member.region !== 'national' && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded capitalize">
                  <MapPin className="w-3 h-3 mr-1" />
                  {member.region}
                </span>
              )}
            </div>
          )}

          {/* Contact Info */}
          <div className="w-full space-y-1">
            {member.email && (
              <div className="flex items-center justify-center text-xs text-gray-600">
                <Mail className="w-3 h-3 mr-1" />
                <span className="truncate max-w-[200px]">{member.email}</span>
              </div>
            )}
            {member.phone && (
              <div className="flex items-center justify-center text-xs text-gray-600">
                <Phone className="w-3 h-3 mr-1" />
                <span>{member.phone}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Build hierarchical tree structure from flat array
function buildHierarchy(executives: ExecutiveMember[]): OrgNode | null {
  // Find root (person with no reportsTo or hierarchyLevel = 0)
  const root = executives.find(e => !e.reportsTo || e.hierarchyLevel === 0);

  if (!root) {
    // If no clear root, use the first person sorted by hierarchyLevel and displayOrder
    const sorted = [...executives].sort((a, b) => {
      if (a.hierarchyLevel !== b.hierarchyLevel) {
        return a.hierarchyLevel - b.hierarchyLevel;
      }
      return a.displayOrder - b.displayOrder;
    });

    if (sorted.length === 0) return null;

    return buildNode(sorted[0], executives);
  }

  return buildNode(root, executives);
}

function buildNode(member: ExecutiveMember, allMembers: ExecutiveMember[]): OrgNode {
  // Find all direct reports
  const directReports = allMembers
    .filter(e => e.reportsTo === member._id)
    .sort((a, b) => {
      // Sort by hierarchyLevel first, then displayOrder
      if (a.hierarchyLevel !== b.hierarchyLevel) {
        return a.hierarchyLevel - b.hierarchyLevel;
      }
      return a.displayOrder - b.displayOrder;
    });

  return {
    member,
    children: directReports.map(report => buildNode(report, allMembers))
  };
}

// Recursively render tree nodes
function renderNode(node: OrgNode): React.JSX.Element {
  const hasChildren = node.children.length > 0;

  if (!hasChildren) {
    return (
      <TreeNode label={<OrgNodeCard member={node.member} />} />
    );
  }

  return (
    <TreeNode label={<OrgNodeCard member={node.member} />}>
      {node.children.map((child, index) => (
        <React.Fragment key={child.member._id || index}>
          {renderNode(child)}
        </React.Fragment>
      ))}
    </TreeNode>
  );
}

export function OrganizationalChart({ executives }: OrganizationalChartProps) {
  // Build hierarchy
  const hierarchyRoot = buildHierarchy(executives);

  if (!hierarchyRoot) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No organizational structure data available</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto py-8">
      <div className="min-w-max mx-auto">
        <Tree
          lineWidth="2px"
          lineColor="#cbd5e1"
          lineBorderRadius="10px"
          label={<OrgNodeCard member={hierarchyRoot.member} />}
        >
          {hierarchyRoot.children.map((child, index) => (
            <React.Fragment key={child.member._id || index}>
              {renderNode(child)}
            </React.Fragment>
          ))}
        </Tree>
      </div>
    </div>
  );
}
