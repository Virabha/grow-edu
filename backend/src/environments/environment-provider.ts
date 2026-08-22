import { Injectable } from '@nestjs/common';

export const ENVIRONMENT_PROVIDER = 'ENVIRONMENT_PROVIDER';

export interface ProvisionedEnvironment {
  providerRef: string;
  workspaceRef: string;
}

export interface EnvironmentProvider {
  provision(params: {
    userId: string;
    projectId: string;
    cpuLimit: number;
    memoryLimitMb: number;
    egressPolicy: string[];
    workspaceRef?: string;
  }): Promise<ProvisionedEnvironment>;
  hibernate(providerRef: string): Promise<void>;
  resume(params: {
    providerRef: string;
    workspaceRef: string;
    cpuLimit: number;
    memoryLimitMb: number;
    egressPolicy: string[];
  }): Promise<void>;
  reclaim(providerRef: string): Promise<void>;
}

@Injectable()
export class HttpEnvironmentProvider implements EnvironmentProvider {
  async provision(params: {
    userId: string;
    projectId: string;
    cpuLimit: number;
    memoryLimitMb: number;
    egressPolicy: string[];
    workspaceRef?: string;
  }): Promise<ProvisionedEnvironment> {
    const response = await fetch('https://provider.example.com/environments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`provision failed (${response.status}): ${body}`);
    }
    return response.json() as Promise<ProvisionedEnvironment>;
  }

  async hibernate(providerRef: string): Promise<void> {
    const response = await fetch(
      `https://provider.example.com/environments/${providerRef}/hibernate`,
      { method: 'POST' },
    );
    if (!response.ok) {
      throw new Error(`hibernate failed (${response.status})`);
    }
  }

  async resume(params: {
    providerRef: string;
    workspaceRef: string;
    cpuLimit: number;
    memoryLimitMb: number;
    egressPolicy: string[];
  }): Promise<void> {
    const { providerRef, ...body } = params;
    const response = await fetch(
      `https://provider.example.com/environments/${providerRef}/resume`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );
    if (!response.ok) {
      throw new Error(`resume failed (${response.status})`);
    }
  }

  async reclaim(providerRef: string): Promise<void> {
    const response = await fetch(
      `https://provider.example.com/environments/${providerRef}/reclaim`,
      { method: 'POST' },
    );
    if (!response.ok) {
      throw new Error(`reclaim failed (${response.status})`);
    }
  }
}
