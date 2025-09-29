'use client';

import React, { useState } from 'react';
import { ClientSelector } from '@/components/ClientSelector';
import { ClientMattersView } from '@/components/ClientMattersView';
import { CreateClientModal } from '@/components/CreateClientModal';
import { ClientData } from '@/lib/storage';

export default function Home() {
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
  const [showCreateClient, setShowCreateClient] = useState(false);

  const handleClientSelect = (client: ClientData) => {
    setSelectedClient(client);
  };

  const handleBack = () => {
    setSelectedClient(null);
  };

  const handleCreateClient = () => {
    setShowCreateClient(true);
  };

  const handleClientCreated = (client: ClientData) => {
    // Optionally auto-select the newly created client
    setSelectedClient(client);
  };

  if (selectedClient) {
    return (
      <ClientMattersView
        client={selectedClient}
        onBack={handleBack}
      />
    );
  }

  return (
    <>
      <ClientSelector
        onClientSelect={handleClientSelect}
        onCreateClient={handleCreateClient}
      />
      <CreateClientModal
        isOpen={showCreateClient}
        onClose={() => setShowCreateClient(false)}
        onClientCreated={handleClientCreated}
      />
    </>
  );
}