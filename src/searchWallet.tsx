import { useEffect, useState } from "react";
import { List, Detail, Toast, showToast, Icon, ActionPanel, Action } from "@raycast/api";
import gatehub from "./provider/gatehub";
import { LoadItemsResponse, WalletType } from "./utils/types";

async function loadWallets(): Promise<LoadItemsResponse<WalletType[]>> {
  try {
    const fetchedWallets = await gatehub.getWallets()
    return {
      items: fetchedWallets
    }
  }catch(err: any) {
    console.error(err)
    return {
      error: {
        toast: {
          style: Toast.Style.Failure,
          title: "Load wallets",
          message: err?.message ?? err
        }
      }
    }
  }
}

export default function Command() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [wallets, setWallets] = useState<WalletType[]>([]);

  useEffect(() => {
    (async () => {
      const response = await loadWallets()
      if (response.items) {
        setWallets(response.items)
      } else {
        showToast(response.error?.toast!)
      }
      setIsLoading(false)
    })();
  }, [gatehub]);

  if (isLoading) {
    return <Detail isLoading={isLoading} />;
  }

  return (
    <List isLoading={isLoading}>
      {wallets.map((wallet) => (
        <List.Item
          key={wallet.uuid}
          id={wallet.uuid}
          title={wallet.name}
          subtitle={wallet.address}
          icon={Icon.Wallet}
          accessories={[{ text: wallet.type }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Wallet Address" content={wallet.address} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
