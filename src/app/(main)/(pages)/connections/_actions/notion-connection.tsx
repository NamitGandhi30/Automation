'use server'

import { db } from '@/lib/db'
import { currentUser } from '@clerk/nextjs'
import { Client } from '@notionhq/client'
export const onNotionConnect = async (
  access_token: string,
  workspace_id: string,
  workspace_icon: string,
  workspace_name: string,
  database_id: string,
  id: string
) => {
  'use server'
  if (access_token) {
    //check if notion is connected
    const notion_connected = await db.notion.findFirst({
      where: {
        OR: [
          { userId: id },
          { accessToken: access_token }
        ]
      },
      include: {
        connections: {
          select: {
            type: true,
          },
        },
      },
    })

    if (!notion_connected) {
      //create connection
      await db.notion.create({
        data: {
          userId: id,
          workspaceIcon: workspace_icon!,
          accessToken: access_token,
          workspaceId: workspace_id!,
          workspaceName: workspace_name!,
          databaseId: database_id,
          connections: {
            create: {
              userId: id,
              type: 'Notion',
            },
          },
        },
      })
    } else {
      // Update existing connection
      await db.notion.update({
        where: {
          id: notion_connected.id
        },
        data: {
          workspaceIcon: workspace_icon!,
          accessToken: access_token,
          workspaceId: workspace_id!,
          workspaceName: workspace_name!,
          databaseId: database_id,
        },
      })
    }
  }
}