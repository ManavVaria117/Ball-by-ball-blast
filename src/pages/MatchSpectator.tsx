import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getMatchByCode } from '@/lib/api';

const MatchSpectator = () => {
  const { code } = useParams<{ code: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let timer: any;
    const fetchData = async () => {
      if (!code) return;
      try {
        const res = await getMatchByCode(code);
        setData(res);
        setError(null);
      } catch (e: any) {
        setError(e?.message || 'Failed to fetch');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    timer = setInterval(fetchData, 4000);
    return () => clearInterval(timer);
  }, [code]);

  const innings = data?.innings?.[data?.inningsIndex || 0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/95 p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>{data?.teamA?.name} vs {data?.teamB?.name}</span>
              <Link to="/" className="text-sm underline">Back</Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div>Loading…</div>
            ) : error ? (
              <div className="text-destructive">{error}</div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <div className="font-semibold">{innings?.battingTeam}</div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{innings?.score || 0}-{innings?.wickets || 0}</div>
                    <div className="text-sm text-muted-foreground">{Math.floor((innings?.balls || 0) / 6)}.{(innings?.balls || 0) % 6} overs</div>
                  </div>
                </div>
                <div className="text-sm">Bowling: {innings?.bowlingTeam}</div>
                <div className="text-sm">Status: {data?.status}</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MatchSpectator;


