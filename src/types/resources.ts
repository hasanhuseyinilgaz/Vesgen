export interface DatabaseResource {
  id: string;
  name: string;
  server: string;
  user: string;
  password?: string;
  databaseName?: string; // Bazı yerlerde kullanılıyor
}

export interface WindowsServerResource {
  id: string;
  name?: string; // Legacy
  alias: string;
  host: string;
  user?: string; // Legacy
  username: string;
  password?: string;
}

export interface LinuxServerResource {
  id: string;
  name: string;
  host: string;
  user: string;
  privateKeyPath?: string;
}

export interface Tenant {
  id: string;
  name: string;
  description: string;
  shortName: string;
  color: string;
  databases: DatabaseResource[];
  windowsServers: WindowsServerResource[];
  linuxServers: LinuxServerResource[];
}
