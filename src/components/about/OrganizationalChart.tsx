import React, { useState } from 'react';
import { ExecutiveMember } from '@/services/aboutService';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Mail, Phone, MapPin, User, Calendar } from 'lucide-react';

interface OrganizationalChartProps {
  executives: ExecutiveMember[];
}

interface OrgNode {
  member: ExecutiveMember;
  children: OrgNode[];
  level: number;
}

// Modal for showing full member details
function MemberDetailModal({ member, open, onOpenChange }: { member: ExecutiveMember; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Executive Member Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* Header with image and name */}
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0">
              {member.profileImage ? (
                <img
                  src={member.profileImage}
                  alt={member.name}
                  className="w-32 h-32 rounded-full object-cover border-4 border-primary/20 shadow-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className={`w-32 h-32 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 border-4 border-primary/20 flex items-center justify-center ${member.profileImage ? 'hidden' : ''}`}
              >
                <User className="w-16 h-16 text-primary/40" />
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{member.name}</h2>
              <p className="text-lg font-semibold text-primary mb-3">{member.position}</p>
              <div className="flex gap-2 flex-wrap">
                {member.department && (
                  <span className="inline-flex items-center px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full">
                    {member.department}
                  </span>
                )}
                <span className="inline-flex items-center px-3 py-1 text-sm font-medium bg-green-100 text-green-800 rounded-full capitalize">
                  <MapPin className="w-4 h-4 mr-1" />
                  {member.region}
                </span>
              </div>
            </div>
          </div>

          {/* Bio */}
          {member.bio && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Biography</h3>
              <p className="text-gray-600 leading-relaxed">{member.bio}</p>
            </div>
          )}

          {/* Contact Information */}
          {(member.email || member.phone) && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Contact Information</h3>
              <div className="space-y-2">
                {member.email && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-4 h-4 text-primary" />
                    <a href={`mailto:${member.email}`} className="hover:text-primary hover:underline">
                      {member.email}
                    </a>
                  </div>
                )}
                {member.phone && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-4 h-4 text-primary" />
                    <a href={`tel:${member.phone}`} className="hover:text-primary hover:underline">
                      {member.phone}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tenure */}
          {member.startDate && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Tenure</h3>
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-4 h-4 text-primary" />
                <span>
                  {new Date(member.startDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  {member.endDate ? ` - ${new Date(member.endDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}` : ' - Present'}
                </span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Custom styled node component - smaller with hover effect
function OrgNodeCard({ member, isTopLevel, onClick }: { member: ExecutiveMember; isTopLevel?: boolean; onClick: () => void }) {
  return (
    <Card
      className={`${isTopLevel ? 'w-40' : 'w-36'} hover:shadow-2xl hover:scale-110 hover:z-10 transition-all duration-300 border-2 border-primary/30 bg-white shadow-md cursor-pointer`}
      onClick={onClick}
    >
      <CardContent className="p-2">
        <div className="flex flex-col items-center text-center">
          {/* Profile Image */}
          <div className="mb-1.5">
            {member.profileImage ? (
              <img
                src={member.profileImage}
                alt={member.name}
                className={`${isTopLevel ? 'w-12 h-12' : 'w-10 h-10'} rounded-full object-cover border-2 border-primary/20 shadow-sm`}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className={`${isTopLevel ? 'w-12 h-12' : 'w-10 h-10'} rounded-full bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20 flex items-center justify-center ${member.profileImage ? 'hidden' : ''}`}
            >
              <User className={`${isTopLevel ? 'w-6 h-6' : 'w-5 h-5'} text-primary/40`} />
            </div>
          </div>

          {/* Name and Position */}
          <h3 className={`font-bold ${isTopLevel ? 'text-xs' : 'text-[10px]'} mb-0.5 text-gray-900 line-clamp-2 leading-tight`}>
            {member.name}
          </h3>
          <p className={`${isTopLevel ? 'text-[9px]' : 'text-[8px]'} font-semibold text-primary mb-0.5 line-clamp-2 leading-tight`}>
            {member.position}
          </p>

          {/* Department/Region Badge - only show region for non-national */}
          {member.region !== 'national' && (
            <span className="inline-flex items-center px-1 py-0.5 text-[8px] font-medium bg-green-100 text-green-800 rounded-full capitalize">
              <MapPin className="w-2 h-2 mr-0.5" />
              {member.region}
            </span>
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
function renderNode(node: OrgNode, onMemberClick: (member: ExecutiveMember) => void): React.ReactElement {
  const hasChildren = node.children.length > 0;
  const isTopLevel = node.level === 0;

  return (
    <div className="flex flex-col items-center">
      {/* The node card */}
      <div className="mb-6">
        <OrgNodeCard
          member={node.member}
          isTopLevel={isTopLevel}
          onClick={() => onMemberClick(node.member)}
        />
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

            {/* Grid of children - compact spacing */}
            <div className={`grid ${node.children.length === 1 ? 'grid-cols-1' : node.children.length === 2 ? 'grid-cols-2' : node.children.length === 3 ? 'grid-cols-3' : node.children.length <= 5 ? 'grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'} gap-x-6 gap-y-10 mt-8`}>
              {node.children.map((child, index) => (
                <div key={child.member._id || index} className="relative">
                  {/* Vertical connector from horizontal line to child */}
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 w-0.5 h-8 bg-gradient-to-b from-primary/20 to-primary/40"></div>
                  {renderNode(child, onMemberClick)}
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
  const [selectedMember, setSelectedMember] = useState<ExecutiveMember | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Build hierarchy
  const hierarchyRoot = buildHierarchy(executives);

  // Debug: Check if any members have reportsTo set
  const membersWithReportsTo = executives.filter(e => e.reportsTo);

  const handleMemberClick = (member: ExecutiveMember) => {
    setSelectedMember(member);
    setModalOpen(true);
  };

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
    <>
      <div className="w-full overflow-x-auto py-12 bg-gradient-to-b from-gray-50 to-white">
        <div className="flex justify-center min-w-fit px-8">
          <div className="max-w-[1600px]">
            <div className="text-center mb-8 text-sm text-gray-500">
              Click on any member to view their full details
            </div>
            {renderNode(hierarchyRoot, handleMemberClick)}
          </div>
        </div>
      </div>

      {/* Member detail modal */}
      {selectedMember && (
        <MemberDetailModal
          member={selectedMember}
          open={modalOpen}
          onOpenChange={setModalOpen}
        />
      )}
    </>
  );
}
