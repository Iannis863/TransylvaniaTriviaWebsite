import { randomBytes } from "node:crypto";
import { storage, type IStorage } from "./storage.js";

export class TeamError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export class TeamService {
  constructor(private source: IStorage = storage) {}
  create(userId: string, name: string, tagline?: string) {
    return this.source.withTeamMutation(async source => {
      const user = await source.getUser(userId);
      if (!user) throw new TeamError(401, "Neautentificat");
      if (user.teamId) throw new TeamError(409, "Ești deja într-o echipă");
      if ((await source.getAllTeams()).some(team => team.name.toLowerCase() === name.toLowerCase())) throw new TeamError(409, "Numele echipei este deja utilizat");
      let inviteCode: string;
      do { inviteCode = randomBytes(6).toString("hex").toUpperCase(); }
      while (await source.getTeamByInviteCode(inviteCode));
      return source.createTeam({ name, leaderId: userId, inviteCode, tagline });
    });
  }
  join(userId: string, inviteCode: string) {
    return this.source.withTeamMutation(async source => {
      const user = await source.getUser(userId);
      if (!user) throw new TeamError(401, "Neautentificat");
      if (user.teamId) throw new TeamError(409, "Ești deja într-o echipă");
      const team = await source.getTeamByInviteCode(inviteCode);
      if (!team) throw new TeamError(404, "Codul de invitație nu este valid");
      const members = await source.getTeamMembers(team.id);
      if (members.length >= 6) throw new TeamError(409, "Echipa are deja 6 membri");
      const updated = await source.updateUserTeam(userId, team.id, "MEMBER");
      return { team, user: updated, members: [...members, updated!] };
    });
  }
  kick(requesterId: string, teamId: string, memberId: string) {
    return this.source.withTeamMutation(async source => {
      const team = await source.getTeam(teamId);
      if (!team || team.leaderId !== requesterId) throw new TeamError(403, "Doar căpitanul poate elimina membri");
      const member = await source.getUser(memberId);
      if (!member || member.teamId !== teamId) throw new TeamError(404, "Membrul nu este în echipă");
      if (memberId === requesterId) throw new TeamError(400, "Căpitanul nu poate fi eliminat");
      await source.updateUserTeam(memberId, null, "MEMBER");
    });
  }
  transfer(requesterId: string, teamId: string, newLeaderId: string) {
    return this.source.withTeamMutation(async source => {
      const team = await source.getTeam(teamId);
      if (!team || team.leaderId !== requesterId) throw new TeamError(403, "Doar căpitanul poate transfera rolul");
      const newLeader = await source.getUser(newLeaderId);
      if (!newLeader || newLeader.teamId !== teamId) throw new TeamError(400, "Noul căpitan nu este în echipă");
      await source.updateUserTeam(requesterId, teamId, "MEMBER");
      await source.updateUserTeam(newLeaderId, teamId, "TEAM_LEADER");
      await source.updateTeam(teamId, { leaderId: newLeaderId });
    });
  }
  leave(userId: string, deleteAccount = false) {
    return this.source.withTeamMutation(async source => {
      const user = await source.getUser(userId);
      if (!user) throw new TeamError(404, "Utilizatorul nu există");
      if (user.teamId) {
        const team = await source.getTeam(user.teamId);
        if (team?.leaderId === userId) {
          const others = (await source.getTeamMembers(team.id)).filter(member => member.id !== userId).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
          if (others.length) {
            await source.updateUserTeam(others[0].id, team.id, "TEAM_LEADER");
            await source.updateTeam(team.id, { leaderId: others[0].id });
          } else await source.deleteTeam(team.id);
        }
      }
      if (deleteAccount) { await source.deleteUser(userId); return undefined; }
      return source.updateUserTeam(userId, null, "MEMBER");
    });
  }
  delete(teamId: string) {
    return this.source.withTeamMutation(source => source.deleteTeam(teamId));
  }
}
export const teamService = new TeamService();
